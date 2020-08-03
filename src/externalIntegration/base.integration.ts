import { ConfigurationDao } from "../configuration/configuration.dao";
import { HttpService, Inject, Injectable, Scope } from "@nestjs/common";
import { Method } from 'axios';
import { AppLogger } from "../appLogger/app.logger";
import * as _ from 'lodash';
import { AuditDao } from "../audit/audit.dao";
import { RedisDao, HOUR } from "../redis/redis.dao";

export class BaseIntegrationError extends Error {}

export interface APIConsume {
    configAddressKey: string;
    address: string;
    body?: any;
    query?: any;
    headers?: any;
    cache: {
        key: string,
        forceConsult: boolean,
        redis: boolean,
        memory: boolean,
        ttl: number
    },
    options: {
        timeout: number,
        method: Method,
        responseType: string
    }
}

export interface APIResponse {
    data: any,
    status: number
}

export const BEARER_TOKENS = 'BearerTokens';
export const API_GTW_BEARER_TOKEN = 'API_GTW_BEARER_TOKEN';

@Injectable({ scope: Scope.REQUEST })
export class BaseIntegration {
    @Inject() protected readonly configurationDao: ConfigurationDao;
    @Inject() protected readonly httpService: HttpService;
    @Inject() protected readonly appLogger: AppLogger;
    @Inject() protected readonly auditDao: AuditDao;
    @Inject() protected readonly redisDao: RedisDao;

    protected context: string;

    private memoryCache = new Map<string, APIResponse>();

    async consumeJsonAPI(consumeOptions: APIConsume): Promise<APIResponse> {
        const { configAddressKey, headers = {}, options = {}, cache: { forceConsult = true } = {} } = consumeOptions;

        const { address } = await this.configurationDao.getIntegrationServiceConfiguration(configAddressKey);

        const updatedHeaders = { ...headers, 'content-type': 'application/json' };
        const updatedOptions = { ...options, responseType: 'json' };

        const newConsume = { 
            ...consumeOptions,
            address,
            headers: updatedHeaders,
            options: updatedOptions,
        } as APIConsume;

        if (forceConsult) {
            this.appLogger.debug({ forceConsult, code: configAddressKey }, this.context);
            return this.consumeAPI(newConsume);
        }

        return await this.consumeCache(newConsume) || await this.consumeAPI(newConsume);
    }

    async consumeCache(consumeOptions: APIConsume): Promise<APIResponse> {
        const { cache: { key = undefined } = {} } = consumeOptions;

        if (!key) {
            throw new BaseIntegrationError('Key must not be falsy');
        }

        return await this.consumeMemoryCachedApi(consumeOptions) || await this.consumeRedisCachedApi(consumeOptions);
    }

    async cacheResult(consumeOptions: APIConsume, response: any): Promise<void> {
        await Promise.all([
            this.cacheIntoMemory(consumeOptions, response),
            this.cacheIntoRedis(consumeOptions, response),
        ]);
    }

    async cacheIntoMemory(consumeOptions: APIConsume, response: any): Promise<any> {
        const { configAddressKey, cache: { memory = false, key = undefined } = {} } = consumeOptions;

        if (memory && key) {
            this.appLogger.debug({ consumeOptions, memoryCacheSave: true, code: configAddressKey }, this.context);
            return this.memoryCache.set(key, response);
        }
    }

    async cacheIntoRedis(consumeOptions: APIConsume, response: any): Promise<any> {
        const { configAddressKey, cache: { redis = false, key = undefined, ttl = HOUR } = {} } = consumeOptions;

        if (redis && key) {
            this.appLogger.debug({ consumeOptions, redisCacheSave: true, code: configAddressKey }, this.context);
            return await this.redisDao.setObject(key, response, ttl);
        }
    }

    async consumeRedisCachedApi(consumeOptions: APIConsume): Promise<APIResponse> {
        const { configAddressKey, cache: { key = undefined, redis = false } = {} } = consumeOptions;

        const redisCache = redis && await this.redisDao.getObject(key);

        this.appLogger.debug({ consumeOptions, redisCacheHit: Boolean(redisCache), code: configAddressKey }, this.context);

        if (redisCache) {
            await this.cacheIntoMemory(consumeOptions, redisCache);
        }
        
        return redisCache;
    }

    async consumeMemoryCachedApi(consumeOptions: APIConsume): Promise<APIResponse> {
        const { configAddressKey, cache: { key = undefined, memory = false } = {} } = consumeOptions;

        const memoryCache = memory && this.memoryCache.get(key);

        this.appLogger.debug({ consumeOptions, memoryCacheHit: Boolean(memoryCache), code: configAddressKey }, this.context);
        
        return memoryCache;
    }

    async consumeAPI(consumeOptions: APIConsume): Promise<APIResponse> {
        const { address, body, query, headers, options } = consumeOptions;
        const interpolatedAddress = this.interpolateQueryParams(address, query);
        const { timeout = 60000, method = 'GET' } = options || {};
        
        const start = Date.now();
        const logArgs = { address, interpolatedAddress, query, options, headers, method, start };

        try {
            this.appLogger.log({ ...logArgs, type: 'call', externalIntegration: true }, this.context);
            const result = await this.httpService.request({
                method,
                url: interpolatedAddress,
                headers,
                timeout,
                data: body,
            }).toPromise();

            const _response = result.data;
            const response = { data: _response, status: 200 } as APIResponse;

            this.log({ ...logArgs, response: JSON.stringify(_response), type: 'response', statusCode: _.get(result, 'status') }, true);
            this.insertAudit({ ...logArgs, response, consumeOptions }, true);

            this.cacheResult(consumeOptions, response);

            return response;
        } catch (err) {
            const status = _.get(err, 'response.status');
            const response = { data: _.get(err, 'response.data'), status };
            const stack = err.stack;
            
            this.log({ ...logArgs, stack, type: 'response', statusCode: status }, false);
            this.insertAudit({ ...logArgs, response, consumeOptions }, false);

            throw err;
        }
    }

    private insertAudit(auditArgs: any, success: boolean) {
        const { response, consumeOptions } = auditArgs;
        const { configAddressKey } = consumeOptions;

        this.auditDao.insertAudit(configAddressKey, consumeOptions, response, success);
    }

    private log(logArgs: any, success: boolean) {
        const { start } = logArgs;

        const end = Date.now();
        const ellapsedTimeInMilli = end - start;
        // TODO arrumar aqui
        if (success) {
            this.appLogger.log({ ...logArgs, ellapsedTimeInMilli, externalIntegration: true }, this.context);
        } else {
            this.appLogger.error({ ...logArgs, ellapsedTimeInMilli, externalIntegration: true }, undefined, this.context);
        }
    }

    private interpolateQueryParams(address: string, query?: any): string {
        if (!query) return address;

        return Object.entries(query).reduce((address, pair) => { 
            const [key, value] = pair;
            return address.replace(`{${key}}`, value as string);
        }, address);
    }
}