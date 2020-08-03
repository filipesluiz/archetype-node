import { createTestingModule } from "../testUtil/unitTest.util";
import { ConfigurationDao } from "../configuration/configuration.dao";
import { AppLogger } from "../appLogger/app.logger";
import { AuditDao } from "../audit/audit.dao";
import { BaseIntegration, APIConsume, BaseIntegrationError } from "./base.integration";
import { ContextIdFactory } from "@nestjs/core";
import { RedisDao } from "../redis/redis.dao";
import { HttpService } from "@nestjs/common";


describe('BaseIntegration', () => {
    let logger;
    let integration;
    let configurationDao;
    let redisDao;
    let httpService;
    let auditDao;

    beforeEach(async () => {
        const contextId = ContextIdFactory.create();
        jest
          .spyOn(ContextIdFactory, 'getByRequest')
          .mockImplementation(() => contextId);

        const moduleRef = await createTestingModule(
            {
                providers: [
                    ConfigurationDao,
                    AuditDao,
                    BaseIntegration
                ]
            }
        );

        logger = await moduleRef.resolve<AppLogger>(AppLogger, contextId);
        integration = await moduleRef.resolve<BaseIntegration>(BaseIntegration, contextId);
        configurationDao = await moduleRef.resolve<ConfigurationDao>(ConfigurationDao, contextId);
        redisDao = moduleRef.get<RedisDao>(RedisDao);
        httpService = moduleRef.get<HttpService>(HttpService);
        auditDao = await moduleRef.resolve<AuditDao>(AuditDao, contextId);
    });

    describe('consumeJsonAPI', () => {
        it('should not try to fetch cache when forceConsult is true', async () => {
            const configAddressKey = 'consumeAddress';
            const address = '123';
            const options = {
                value: '123'
            };
            const cache = {
                forceConsult: true
            };
            const configurationResult = { address };
            const headers = {
                header1: 'header1',
                header2: 'header2'
            };
            const body = {
                value: '1'
            };
            const consumeOptions = {
                configAddressKey,
                headers,
                body,
                cache,
                options,
            } as unknown as APIConsume;

            const newConsume = { 
                ...consumeOptions,
                address,
                headers: { ...headers, 'content-type': 'application/json' } as unknown,
                options: { ...options, responseType: 'json' } as unknown,
            } as APIConsume;

            const consumeAPIResult = 'consumeAPIResult';

            const getIntegrationServiceConfiguration = jest.spyOn(configurationDao, 'getIntegrationServiceConfiguration');
            const consumeAPI = jest.spyOn(integration, 'consumeAPI');
            const consumeCache = jest.spyOn(integration, 'consumeCache');
            const log = jest.spyOn(logger, 'debug');

            consumeAPI.mockResolvedValue(consumeAPIResult);
            getIntegrationServiceConfiguration.mockResolvedValue(configurationResult);

            const result = await integration.consumeJsonAPI(consumeOptions);

            expect(result).toBe(consumeAPIResult);
            expect(log).toBeCalledWith({ forceConsult: true, code: configAddressKey }, undefined);
            expect(log).toBeCalledTimes(1);
            expect(consumeAPI).toBeCalledWith(newConsume);
            expect(consumeCache).toBeCalledTimes(0);
        });

        it('should not try to fetch cache when forceConsult is true and should use default values for APIConsume', async () => {
            const configAddressKey = 'consumeAddress';
            const address = '123';
            const configurationResult = { address };
            const body = {
                value: '1'
            };
            const consumeOptions = {
                configAddressKey,
                body,
            } as unknown as APIConsume;

            const newConsume = { 
                ...consumeOptions,
                address,
                headers: { 'content-type': 'application/json' } as unknown,
                options: { responseType: 'json' } as unknown,
            } as APIConsume;

            const consumeAPIResult = 'consumeAPIResult';

            const getIntegrationServiceConfiguration = jest.spyOn(configurationDao, 'getIntegrationServiceConfiguration');
            const consumeAPI = jest.spyOn(integration, 'consumeAPI');
            const consumeCache = jest.spyOn(integration, 'consumeCache');
            const log = jest.spyOn(logger, 'debug');

            consumeAPI.mockResolvedValue(consumeAPIResult);
            getIntegrationServiceConfiguration.mockResolvedValue(configurationResult);

            const result = await integration.consumeJsonAPI(consumeOptions);

            expect(result).toBe(consumeAPIResult);
            expect(log).toBeCalledWith({ forceConsult: true, code: configAddressKey }, undefined);
            expect(log).toBeCalledTimes(1);
            expect(consumeAPI).toBeCalledWith(newConsume);
            expect(consumeCache).toBeCalledTimes(0);
        });

        it('should return cached value, if there is one, when forceConsult is false', async () => {
            const configAddressKey = 'consumeAddress';
            const address = '123';
            const cache = {
                forceConsult: false
            };
            const configurationResult = { address };
            const body = {
                value: '1'
            };
            const consumeOptions = {
                configAddressKey,
                body,
                cache,
            } as unknown as APIConsume;

            const newConsume = { 
                ...consumeOptions,
                address,
                headers: { 'content-type': 'application/json' } as unknown,
                options: { responseType: 'json' } as unknown,
            } as APIConsume;

            const consumeCacheResult = 'consumeCache';

            const getIntegrationServiceConfiguration = jest.spyOn(configurationDao, 'getIntegrationServiceConfiguration');
            const consumeAPI = jest.spyOn(integration, 'consumeAPI');
            const consumeCache = jest.spyOn(integration, 'consumeCache');
            const log = jest.spyOn(logger, 'log');

            consumeCache.mockResolvedValue(consumeCacheResult);
            getIntegrationServiceConfiguration.mockResolvedValue(configurationResult);

            const result = await integration.consumeJsonAPI(consumeOptions);

            expect(result).toBe(consumeCacheResult);
            expect(log).toBeCalledTimes(0);
            expect(consumeCache).toBeCalledWith(newConsume);
            expect(consumeCache).toBeCalledTimes(1);
            expect(consumeAPI).toBeCalledTimes(0);
        });

        it('should not return cached value, when there isnt one, and should consume api', async () => {
            const configAddressKey = 'consumeAddress';
            const address = '123';
            const cache = {
                forceConsult: false
            };
            const configurationResult = { address };
            const body = {
                value: '1'
            };
            const consumeOptions = {
                configAddressKey,
                body,
                cache,
            } as unknown as APIConsume;

            const newConsume = { 
                ...consumeOptions,
                address,
                headers: { 'content-type': 'application/json' } as unknown,
                options: { responseType: 'json' } as unknown,
            } as APIConsume;

            const consumeCacheResult = undefined;
            const consumeAPIResult = 'consumeAPIResult';

            const getIntegrationServiceConfiguration = jest.spyOn(configurationDao, 'getIntegrationServiceConfiguration');
            const consumeAPI = jest.spyOn(integration, 'consumeAPI');
            const consumeCache = jest.spyOn(integration, 'consumeCache');
            const log = jest.spyOn(logger, 'log');

            consumeCache.mockResolvedValue(consumeCacheResult);
            consumeAPI.mockResolvedValue(consumeAPIResult);
            getIntegrationServiceConfiguration.mockResolvedValue(configurationResult);

            const result = await integration.consumeJsonAPI(consumeOptions);

            expect(result).toBe(consumeAPIResult);
            expect(log).toBeCalledTimes(0);
            expect(consumeCache).toBeCalledWith(newConsume);
            expect(consumeCache).toBeCalledTimes(1);
            expect(consumeAPI).toBeCalledTimes(1);
            expect(consumeAPI).toBeCalledWith(newConsume);
        });
    });

    describe('consumeCache', () => {
        it('should throw exception when key is falsy', async () => {
            const consumeOptions = {
                cache: {}
            } as APIConsume;

            expect(integration.consumeCache(consumeOptions)).rejects.toThrow(BaseIntegrationError)
        });

        it('should throw exception when key is falsy with default arguments', async () => {
            const consumeOptions = { } as APIConsume;

            expect(integration.consumeCache(consumeOptions)).rejects.toThrow(BaseIntegrationError)
        });

        it('should return memory cache if there is one', async () => {
            const key = 'key';
            const memoryCache = 'memoryCache';

            const consumeOptions = {
                cache: { key }
            } as APIConsume;
            
            const consumeMemoryCachedApi = jest.spyOn(integration, 'consumeMemoryCachedApi');
            const consumeRedisCachedApi = jest.spyOn(integration, 'consumeRedisCachedApi');

            consumeMemoryCachedApi.mockResolvedValue(memoryCache);

            const result = await integration.consumeCache(consumeOptions);

            expect(result).toBe(memoryCache);
            expect(consumeMemoryCachedApi).toBeCalledWith(consumeOptions);
            expect(consumeMemoryCachedApi).toBeCalledTimes(1);
            expect(consumeRedisCachedApi).toBeCalledTimes(0);
        });

        it('should return memory cache if there is one', async () => {
            const key = 'key';
            const memoryCache = 'memoryCache';

            const consumeOptions = {
                cache: { key }
            } as APIConsume;
            
            const consumeMemoryCachedApi = jest.spyOn(integration, 'consumeMemoryCachedApi');
            const consumeRedisCachedApi = jest.spyOn(integration, 'consumeRedisCachedApi');

            consumeMemoryCachedApi.mockResolvedValue(memoryCache);

            const result = await integration.consumeCache(consumeOptions);

            expect(result).toBe(memoryCache);
            expect(consumeMemoryCachedApi).toBeCalledWith(consumeOptions);
            expect(consumeMemoryCachedApi).toBeCalledTimes(1);
            expect(consumeRedisCachedApi).toBeCalledTimes(0);
        });

        it('should return redis cache if there is one and there is no memory cache', async () => {
            const key = 'key';
            const memoryCache = undefined;
            const redisCache = 'redisCache';

            const consumeOptions = {
                cache: { key }
            } as APIConsume;
            
            const consumeMemoryCachedApi = jest.spyOn(integration, 'consumeMemoryCachedApi');
            const consumeRedisCachedApi = jest.spyOn(integration, 'consumeRedisCachedApi');

            consumeMemoryCachedApi.mockResolvedValue(memoryCache);
            consumeRedisCachedApi.mockResolvedValue(redisCache);

            const result = await integration.consumeCache(consumeOptions);

            expect(result).toBe(redisCache);
            expect(consumeMemoryCachedApi).toBeCalledWith(consumeOptions);
            expect(consumeMemoryCachedApi).toBeCalledTimes(1);
            expect(consumeRedisCachedApi).toBeCalledWith(consumeOptions);
            expect(consumeRedisCachedApi).toBeCalledTimes(1);
        });
    });

    describe('cacheResult', () => {
        it('should cache into memory and redis', async () => {
            const consumeOptions = { } as APIConsume;
            const response = 'response';
    
            const cacheIntoMemory = jest.spyOn(integration, 'cacheIntoMemory');
            const cacheIntoRedis = jest.spyOn(integration, 'cacheIntoRedis');

            cacheIntoMemory.mockResolvedValue(undefined);
            cacheIntoRedis.mockResolvedValue(undefined);
    
            await integration.cacheResult(consumeOptions, response);
    
            expect(cacheIntoMemory).toBeCalledWith(consumeOptions, response);
            expect(cacheIntoMemory).toBeCalledTimes(1);
            expect(cacheIntoRedis).toBeCalledWith(consumeOptions, response);
            expect(cacheIntoRedis).toBeCalledTimes(1);
        });
    });

    describe('cacheIntoMemory', () => {
        it('should cache not cache into memory when memory cache is not enabled using default params', async () => {
            const apiConsume = { } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(integration.memoryCache, 'set');

            await integration.cacheIntoMemory(apiConsume, response);

            expect(set).toBeCalledTimes(0);
        });

        it('should cache not cache into memory when memory cache is enabled but key is undefined', async () => {
            const apiConsume = { cache: { memory: true } } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(integration.memoryCache, 'set');

            await integration.cacheIntoMemory(apiConsume, response);

            expect(set).toBeCalledTimes(0);
        });

        it('should cache into memory when memory cache is enabled and key is defined', async () => {
            const key = 'key';
            const apiConsume = { cache: { memory: true, key } } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(integration.memoryCache, 'set');

            await integration.cacheIntoMemory(apiConsume, response);

            expect(set).toBeCalledWith(key, response);
            expect(set).toBeCalledTimes(1);
        });
    });

    describe('cacheIntoRedis', () => {
        it('should cache not cache into redis when redis cache is not enabled using default params', async () => {
            const apiConsume = { } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(redisDao, 'setObject');

            await integration.cacheIntoRedis(apiConsume, response);

            expect(set).toBeCalledTimes(0);
        });

        it('should cache not cache into redis when redis cache is enabled but key is undefined', async () => {
            const apiConsume = { cache: { redis: true } } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(redisDao, 'setObject');

            await integration.cacheIntoRedis(apiConsume, response);

            expect(set).toBeCalledTimes(0);
        });

        it('should cache into memory when memory cache is enabled and key is defined', async () => {
            const key = 'key';
            const ttl = 123;
            const apiConsume = { cache: { redis: true, key, ttl } } as APIConsume;
            const response = 'response';

            const set = jest.spyOn(redisDao, 'setObject');

            await integration.cacheIntoRedis(apiConsume, response);

            expect(set).toBeCalledWith(key, response, ttl);
            expect(set).toBeCalledTimes(1);
        });
    });

    describe('consumeRedisCachedApi', () => {
        it('should not fetch redis data and not try save into memory when redis cache is disabled', async () => {
            const consumeOptions = { cache: { redis: false } } as APIConsume;

            const getObject = jest.spyOn(redisDao, 'getObject');
            const cacheIntoMemory = jest.spyOn(integration, 'cacheIntoMemory');

            const result = await integration.consumeRedisCachedApi(consumeOptions);

            expect(result).toBeFalsy();

            expect(getObject).toBeCalledTimes(0);
            expect(cacheIntoMemory).toBeCalledTimes(0);
        });

        it('should not fetch redis data and not try save into memory when redis cache is disabled with default params', async () => {
            const consumeOptions = { } as APIConsume;

            const getObject = jest.spyOn(redisDao, 'getObject');
            const cacheIntoMemory = jest.spyOn(integration, 'cacheIntoMemory');

            const result = await integration.consumeRedisCachedApi(consumeOptions);

            expect(result).toBeFalsy();

            expect(getObject).toBeCalledTimes(0);
            expect(cacheIntoMemory).toBeCalledTimes(0);
        });

        it('should fetch redis cache data when redis is enabled but not save into memory when redis cache does not exists', async () => {
            const key = 'key';
            const consumeOptions = { cache: { redis: true, key } } as APIConsume;
            const cachedResult = undefined;

            const getObject = jest.spyOn(redisDao, 'getObject');
            const cacheIntoMemory = jest.spyOn(integration, 'cacheIntoMemory');

            getObject.mockResolvedValue(cachedResult);

            const result = await integration.consumeRedisCachedApi(consumeOptions);

            expect(result).toBeFalsy();

            expect(getObject).toBeCalledTimes(1);
            expect(getObject).toBeCalledWith(key);
            expect(cacheIntoMemory).toBeCalledTimes(0);
        });

        it('should fetch redis cache data when redis is enabled and save into memory when cache exists', async () => {
            const key = 'key';
            const consumeOptions = { cache: { redis: true, key } } as APIConsume;
            const cachedResult = 'cachedResult';

            const getObject = jest.spyOn(redisDao, 'getObject');
            const cacheIntoMemory = jest.spyOn(integration, 'cacheIntoMemory');

            getObject.mockResolvedValue(cachedResult);

            const result = await integration.consumeRedisCachedApi(consumeOptions);

            expect(result).toBe(cachedResult);

            expect(getObject).toBeCalledTimes(1);
            expect(getObject).toBeCalledWith(key);
            expect(cacheIntoMemory).toBeCalledTimes(1);
            expect(cacheIntoMemory).toBeCalledWith(consumeOptions, cachedResult);
        });
    });

    describe('consumeMemoryCachedApi', () => {
        it('should not save into memory cache when memory cache is not enabled', async () => {
            const consumeOptions = { cache: { memory: false } } as APIConsume;

            const get = jest.spyOn(integration.memoryCache, 'get');

            const result = await integration.consumeMemoryCachedApi(consumeOptions);

            expect(get).toBeCalledTimes(0);
            expect(result).toBeFalsy();
        });

        it('should not save into memory cache when memory cache is not enabled with default params', async () => {
            const consumeOptions = { } as APIConsume;

            const get = jest.spyOn(integration.memoryCache, 'get');

            const result = await integration.consumeMemoryCachedApi(consumeOptions);

            expect(get).toBeCalledTimes(0);
            expect(result).toBeFalsy();
        });

        it('should return memory cached value when memory cache is enabled', async () => {
            const key = 'key';
            const consumeOptions = { cache: { memory: true, key } } as APIConsume;
            const cachedValue = 'cachedValue';

            const get = jest.spyOn(integration.memoryCache, 'get');

            get.mockReturnValue(cachedValue);

            const result = await integration.consumeMemoryCachedApi(consumeOptions);

            expect(get).toBeCalledTimes(1);
            expect(get).toBeCalledWith(key);
            expect(result).toBe(cachedValue);
        });
    });

    describe('consumeAPI', () => {
        it('should successfuly consume api with default params', async () => {
            const address = 'address';
            const body = 'body';
            const query = 'query';
            const headers = 'headers';
            const start = 'start';
            const interpolatedAddress = 'interpolatedAddress';
            const timeout = 60000;
            const method = 'GET';
            const logArgs = { address, interpolatedAddress, query, headers, method, start };
            const consumeOptions = {
                address,
                body,
                query,
                headers
            };

            const data = 'data';
            const statusCode = 123;
            const requestResult = { data, status: statusCode };
            const mappedResponse = { data, status: 200 };

            const interpolateQueryParams = jest.spyOn(integration, 'interpolateQueryParams');
            const appLog = jest.spyOn(logger, 'log');
            const log = jest.spyOn(integration, 'log');
            const request = jest.spyOn(httpService, 'request');
            const insertAudit = jest.spyOn(integration, 'insertAudit');
            const cacheResult = jest.spyOn(integration, 'cacheResult');

            jest.spyOn(Date, 'now').mockReturnValue(start);
            interpolateQueryParams.mockReturnValue(interpolatedAddress);
            request.mockReturnValue({ toPromise: () => Promise.resolve(requestResult) });
            insertAudit.mockImplementation(() => {});
            cacheResult.mockImplementation(() => {});
            log.mockImplementation(() => {});

            const result = await integration.consumeAPI(consumeOptions);
            
            expect(interpolateQueryParams).toBeCalledTimes(1);
            expect(interpolateQueryParams).toBeCalledWith(address, query);
            expect(request).toBeCalledTimes(1);
            expect(request).toBeCalledWith({ method, url: interpolatedAddress, headers, timeout, data: body });
            expect(log).toBeCalledTimes(1);
            expect(log).toBeCalledWith({ ...logArgs, options: undefined, response: JSON.stringify(data), type: 'response', statusCode }, true);
            expect(appLog).toBeCalledTimes(1);
            expect(appLog).toBeCalledWith({ ...logArgs, externalIntegration: true, options: undefined, type: 'call' }, undefined);
            expect(insertAudit).toBeCalledTimes(1);
            expect(insertAudit).toBeCalledWith({ ...logArgs, response: mappedResponse, consumeOptions }, true);
            expect(cacheResult).toBeCalledTimes(1);
            expect(cacheResult).toBeCalledWith(consumeOptions, mappedResponse);

            expect(result).toStrictEqual(mappedResponse);
        });

        it('should handle rejection on api consume', async () => {
            const address = 'address';
            const body = 'body';
            const query = 'query';
            const headers = 'headers';
            const start = 'start';
            const interpolatedAddress = 'interpolatedAddress';
            const timeout = 60000;
            const method = 'GET';
            const logArgs = { address, interpolatedAddress, query, headers, method, start };
            const consumeOptions = {
                address,
                body,
                query,
                headers
            };

            const data = 'data';
            const statusCode = 123;
            const requestResult = { response: { data, status: statusCode } };
            const mappedResponse = { data, status: statusCode };

            const interpolateQueryParams = jest.spyOn(integration, 'interpolateQueryParams');
            const appLog = jest.spyOn(logger, 'log');
            const log = jest.spyOn(integration, 'log');
            const request = jest.spyOn(httpService, 'request');
            const insertAudit = jest.spyOn(integration, 'insertAudit');

            jest.spyOn(Date, 'now').mockReturnValue(start);
            interpolateQueryParams.mockReturnValue(interpolatedAddress);
            request.mockReturnValue({ toPromise: () => Promise.reject(requestResult) });
            insertAudit.mockImplementation(() => {});
            log.mockImplementation(() => {});

            try {
                await integration.consumeAPI(consumeOptions);
            } catch (err) {
                expect(err).toStrictEqual(requestResult);
            }
            
            expect(interpolateQueryParams).toBeCalledTimes(1);
            expect(interpolateQueryParams).toBeCalledWith(address, query);
            expect(request).toBeCalledTimes(1);
            expect(request).toBeCalledWith({ method, url: interpolatedAddress, headers, timeout, data: body });
            expect(log).toBeCalledTimes(1);
            expect(log).toBeCalledWith({ ...logArgs, type: 'response', statusCode }, false);
            expect(appLog).toBeCalledTimes(1);
            expect(appLog).toBeCalledWith({ ...logArgs, externalIntegration: true, options: undefined, type: 'call' }, undefined);
            expect(insertAudit).toBeCalledTimes(1);
            expect(insertAudit).toBeCalledWith({ ...logArgs, response: mappedResponse, consumeOptions }, false);
        });
    });

    describe('insertAudit', () => {
        it('should insert audit', async () => {
            const response = 'response';
            const configAddressKey = 'configAddressKey';
            const consumeOptions = { configAddressKey };
            const success = true;

            const auditArgs = { response, consumeOptions };

            const insertAudit = jest.spyOn(auditDao, 'insertAudit');
            insertAudit.mockImplementation(() => {});

            integration.insertAudit(auditArgs, success);

            expect(insertAudit).toBeCalledTimes(1);
            expect(insertAudit).toBeCalledWith(configAddressKey, consumeOptions, response, success);
        });
    });

    describe('log', () => {
        it('should log success when is a success', async () => {
            const end = 2;
            const start = 1;

            const logArgs = { start };
            const ellapsedTimeInMilli = 1;

            jest.spyOn(Date, 'now').mockReturnValue(end);
            const error = jest.spyOn(logger, 'error');
            const success = jest.spyOn(logger, 'log');

            integration.log(logArgs, true);

            expect(error).toBeCalledTimes(0);
            expect(success).toBeCalledTimes(1);
            expect(success).toBeCalledWith({ ...logArgs, externalIntegration: true, ellapsedTimeInMilli }, undefined);
        });

        it('should log error when is a error', async () => {
            const end = 2;
            const start = 1;

            const logArgs = { start };
            const ellapsedTimeInMilli = 1;

            jest.spyOn(Date, 'now').mockReturnValue(end);
            const success = jest.spyOn(logger, 'log');
            const error = jest.spyOn(logger, 'error');

            integration.log(logArgs, false);

            expect(error).toBeCalledTimes(1);
            expect(success).toBeCalledTimes(0);
            expect(error).toBeCalledWith({ ...logArgs, externalIntegration: true, ellapsedTimeInMilli }, undefined, undefined);
        });
    });

    describe('interpolateQueryParams', () => {
        it('should return address when query is falsy', async () => {
            const address = 'address';
            const query = undefined;

            const result = integration.interpolateQueryParams(address, query);

            expect(result).toBe(address);
        });

        it('should replace values', async () => {
            const address = 'test?={a},test2={b}';
            const query = { a: 1, b: 2 };

            const oracle = 'test?=1,test2=2';

            const result = integration.interpolateQueryParams(address, query);

            expect(result).toBe(oracle);
        });
    });
});