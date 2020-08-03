import { Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { RedisService } from 'nestjs-redis';
import { AppLogger } from '../appLogger/app.logger';

export const ONE_MINUTE = 60;
export const HALF_HOUR = ONE_MINUTE * 30;
export const HOUR = HALF_HOUR * 2;

export class UpdateError extends Error {}

@Injectable()
export class RedisDao {
    constructor(
        private readonly appLogger: AppLogger,
        private readonly redisService: RedisService,
    ) {}

    getObject(key: string): Promise<any> {
        return this.get(key).then(JSON.parse);
    }

    async setObject(key: string, value: any, ttl?: number): Promise<any> {
        await this.set(key, JSON.stringify(value), ttl);
        return value;
    }

    async setOrUpdateObject(
        key: string,
        value: any,
        ttl?: number,
    ): Promise<any> {
        try {
            return await this.updateObject(key, value);
        } catch (err) {
            if (err instanceof UpdateError) {
                return await this.setObject(key, value, ttl);
            }

            throw err;
        }
    }

    async updateObject(
        key: string,
        attributesToUpdate: Record<string, any>,
    ): Promise<any> {
        const client = await this.getClient();
        const result = await client
            .pipeline()
            .ttl(key)
            .get(key)
            .exec();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // eslint-disable-next-line no-unused-vars
        const [[a, ttl], [b, object]] = result;
        if (!object) {
            throw new UpdateError(
                `You tried to update a non existing redis object: ${key}`,
            );
        }

        const parsedObj = JSON.parse(object);

        return this.setObject(
            key,
            { ...parsedObj, ...attributesToUpdate },
            ttl,
        );
    }

    async set(key: string, value: any, ttl: number = HOUR): Promise<any> {
        const client = await this.getClient();
        await client.set(key, value, 'EX', ttl);
        return value;
    }

    async get(key: string): Promise<any> {
        const client = await this.getClient();
        return client.get(key);
    }

    getClient(name?: string): Redis.Redis {
        return this.redisService.getClient(name);
    }
}
