import { Injectable, Scope } from "@nestjs/common";
import { Configuration } from "./configuration.model";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { RedisDao } from "../redis/redis.dao";
import { AppLogger } from "../appLogger/app.logger";

export const INTEGRATION_SERVICES = 'IntegrationServices';

export class ConfigurationException extends Error {
    constructor(message: string) {
        super(message);
    }
}

@Injectable({ scope: Scope.REQUEST })
export class ConfigurationDao {
    private memoryCache = new Map<string, any>();

    constructor(
        @InjectModel(Configuration.name) private readonly model: Model<Configuration>,
        private readonly appLogger: AppLogger,
        private readonly redisDao: RedisDao
    ) {
        this.appLogger.setContext(ConfigurationDao.name);
    }

    async getConfiguration(name: string): Promise<Configuration> {
        const cachedResult = await this.getMemoryCache(name) || await this.getRedisCache(name);

        const result = cachedResult || (await this.findInDatabase(name));

        return result;
    }

    async getIntegrationServiceConfiguration(name: string): Promise<any> {
        const result = await this.getConfiguration(INTEGRATION_SERVICES);
        const service = result.value.find((service) => service && service.name === name);

        if (!service) {
            throw new ConfigurationException(`Could not find integration service "${name}"`);
        }

        return service;
    }

    async findInDatabase(name: string): Promise<any> {
        this.appLogger.debug(`Mongo fetching: ${name}`);
        const result = await this.model.findOne({ name });

        if (!result) {
            throw new ConfigurationException(`Could not find configuration "${name}"`);
        }

        return await this.cacheIntoRedis(name, result.toObject());
    }

    async getDefaultConfiguration(name: string, subValue: string): Promise<any> {
        const result = await this.getConfiguration(name);

        return result.value && result.value.find((value) => value && value.name === subValue);
    }

    async cacheIntoMemory(key: string, value: unknown): Promise<any> {
        this.memoryCache.set(key, value);
        return value;
    }

    async cacheIntoRedis(key: string, value: unknown): Promise<any> {
        await this.cacheIntoMemory(key, value);
        return this.redisDao.setObject(this.getKey(key), value);
    }

    async getMemoryCache(key: string): Promise<any> {
        const result = this.memoryCache.get(key);

        if (result) {
            this.appLogger.debug(`Memory cache hit: ${key}`);
        }

        return result;
    }

    async getRedisCache(key: string): Promise<any> {
        const result = await this.redisDao.getObject(this.getKey(key));

        if (result) {
            this.cacheIntoMemory(key, result);
            this.appLogger.debug(`Redis cache hit: ${key}`);
        }

        return result;
    }

    getKey(key: string): string {
        return `configuration:${key}`;
    }
}