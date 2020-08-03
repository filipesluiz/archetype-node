import { createTestingModule } from "../testUtil/unitTest.util";
import { ConfigurationDao, ConfigurationException, INTEGRATION_SERVICES } from "./configuration.dao";
import { ContextIdFactory } from "@nestjs/core";
import { Configuration } from "./configuration.model";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RedisDao } from "../redis/redis.dao";

describe('ConfigurationDao', () => {
    let configDao;
    let model;
    let redisDao;

    beforeEach(async () => {
        const contextId = ContextIdFactory.create();
        jest
          .spyOn(ContextIdFactory, 'getByRequest')
          .mockImplementation(() => contextId);

        const moduleRef = await createTestingModule({
            providers: [ConfigurationDao]
        });

        configDao = await moduleRef.resolve<ConfigurationDao>(ConfigurationDao, contextId);
        redisDao = moduleRef.get<RedisDao>(RedisDao);
        model = moduleRef.get<Model<Configuration>>(getModelToken(Configuration.name));
    });
    describe('getConfiguration', () => {
        it('should return memory cached result when it exists', async () => {
            const name = 'name';
            const cachedResult = 'cachedResult';

            const getMemoryCache = jest.spyOn(configDao, 'getMemoryCache');
            const getRedisCache = jest.spyOn(configDao, 'getRedisCache');

            getMemoryCache.mockResolvedValue(cachedResult);

            const result = await configDao.getConfiguration(name);

            expect(getMemoryCache).toBeCalledTimes(1);
            expect(getMemoryCache).toBeCalledWith(name);
            expect(getRedisCache).toBeCalledTimes(0);
            expect(result).toBe(cachedResult);
        });

        it('should return redis cached result when it exists and there is no in memory', async () => {
            const name = 'name';
            const cachedResult = 'cachedResult';

            const getMemoryCache = jest.spyOn(configDao, 'getMemoryCache');
            const getRedisCache = jest.spyOn(configDao, 'getRedisCache');

            getMemoryCache.mockResolvedValue(undefined);
            getRedisCache.mockResolvedValue(cachedResult);

            const result = await configDao.getConfiguration(name);

            expect(getRedisCache).toBeCalledTimes(1);
            expect(getRedisCache).toBeCalledWith(name);
            expect(getMemoryCache).toBeCalledTimes(1);
            expect(getMemoryCache).toBeCalledWith(name);
            expect(result).toBe(cachedResult);
        });

        it('should return mongo value when there is no cache at all', async () => {
            const name = 'name';
            const mongoResult = 'mongoResult';

            const getMemoryCache = jest.spyOn(configDao, 'getMemoryCache');
            const getRedisCache = jest.spyOn(configDao, 'getRedisCache');
            const findInDatabase = jest.spyOn(configDao, 'findInDatabase');

            getMemoryCache.mockResolvedValue(undefined);
            getRedisCache.mockResolvedValue(undefined);
            findInDatabase.mockResolvedValue(mongoResult);

            const result = await configDao.getConfiguration(name);

            expect(getRedisCache).toBeCalledTimes(1);
            expect(getRedisCache).toBeCalledWith(name);
            expect(getMemoryCache).toBeCalledTimes(1);
            expect(getMemoryCache).toBeCalledWith(name);
            expect(findInDatabase).toBeCalledTimes(1);
            expect(findInDatabase).toBeCalledWith(name);
            expect(result).toBe(mongoResult);
        });
    });

    describe('getIntegrationServiceConfiguration', () => {
        it('should throw exception when service is falsy', async () => {
            const name = 'name';
            const result = {
                value: [
                    {
                        name: '123',
                    },
                    undefined
                ]
            };

            const getConfiguration = jest.spyOn(configDao, 'getConfiguration');

            getConfiguration.mockResolvedValue(result);

            try {
                await configDao.getIntegrationServiceConfiguration(name);
            } catch (err) {
                expect(err).toBeInstanceOf(ConfigurationException);
            }

            expect(getConfiguration).toBeCalledTimes(1);
            expect(getConfiguration).toBeCalledWith(INTEGRATION_SERVICES);
        });

        it('should return configuration value', async () => {
            const name = 'name';
            const service = { name };
            const result = {
                value: [service]
            };

            const getConfiguration = jest.spyOn(configDao, 'getConfiguration');

            getConfiguration.mockResolvedValue(result);

            const configResult = await configDao.getIntegrationServiceConfiguration(name);

            expect(getConfiguration).toBeCalledTimes(1);
            expect(getConfiguration).toBeCalledWith(INTEGRATION_SERVICES);
            expect(configResult).toStrictEqual(service);
        });
    });

    describe('findInDatabase', () => {
        it('should throw exception when configuration value does not exists', async () => {
            const name = 'name';
            const config = undefined;

            const findOne = jest.spyOn(model, 'findOne');

            findOne.mockResolvedValue(config);

            try {
                await configDao.findInDatabase(name);
            } catch (err) {
                expect(err).toBeInstanceOf(ConfigurationException);
            }

            expect(findOne).toBeCalledTimes(1);
            expect(findOne).toBeCalledWith({ name });
        });

        it('should return fetched value from mongo and cache it', async () => {
            const name = 'name';
            const configObj = 'configObj';
            const config = { toObject: () => configObj };

            const findOne = jest.spyOn(model, 'findOne');
            const cacheIntoRedis = jest.spyOn(configDao, 'cacheIntoRedis');

            findOne.mockResolvedValue(config);
            cacheIntoRedis.mockResolvedValue(config);

            const result = await configDao.findInDatabase(name);

            expect(findOne).toBeCalledTimes(1);
            expect(findOne).toBeCalledWith({ name });
            expect(cacheIntoRedis).toBeCalledTimes(1);
            expect(cacheIntoRedis).toBeCalledWith(name, configObj);
            expect(result).toStrictEqual(config);
        });
    });

    describe('getDefaultConfiguration', () => {
        it('should return undefined when result value is falsy', async () => {
            const config = {};
            const name = 'name';
            const subValue = 'subValue';

            const getConfiguration = jest.spyOn(configDao, 'getConfiguration');

            getConfiguration.mockResolvedValue(config);

            const result = await configDao.getDefaultConfiguration(name, subValue);

            expect(getConfiguration).toBeCalledTimes(1);
            expect(getConfiguration).toBeCalledWith(name);
            expect(result).toBeFalsy();
        });

        it('should return value with name matching subValue', async () => {
            const name = 'name';
            const subValue = 'subValue';
            const value = {
                name: subValue
            };
            const config = {
                value: [undefined, value]
            };

            const getConfiguration = jest.spyOn(configDao, 'getConfiguration');

            getConfiguration.mockResolvedValue(config);

            const result = await configDao.getDefaultConfiguration(name, subValue);

            expect(getConfiguration).toBeCalledTimes(1);
            expect(getConfiguration).toBeCalledWith(name);
            expect(result).toStrictEqual(value);
        });
    });

    describe('cacheIntoMemory', () => {
        it('should cache value in memory', async () => {
            const key = 'key';
            const value = 'value';

            const set = jest.spyOn(configDao.memoryCache, 'set');

            const result = await configDao.cacheIntoMemory(key, value);

            expect(set).toBeCalledTimes(1);
            expect(set).toBeCalledWith(key, value);
            expect(result).toBe(value);
        });
    });

    describe('cacheIntoRedis', () => {
        it('should cache into redis and into memory', async () => {
            const key = 'key';
            const value = 'value';
            const cachedValue = 'cachedValue';
            const redisKey = 'redisKey';
            
            const cacheIntoMemory = jest.spyOn(configDao, 'cacheIntoMemory');
            const setObject = jest.spyOn(redisDao, 'setObject');
            const getKey = jest.spyOn(configDao, 'getKey');

            cacheIntoMemory.mockImplementation(() => Promise.resolve());
            setObject.mockResolvedValue(cachedValue);
            getKey.mockReturnValue(redisKey);

            const result = await configDao.cacheIntoRedis(key, value);

            expect(cacheIntoMemory).toBeCalledTimes(1);
            expect(cacheIntoMemory).toBeCalledWith(key, value);
            expect(setObject).toBeCalledTimes(1);
            expect(setObject).toBeCalledWith(redisKey, value);
            expect(getKey).toBeCalledTimes(1);
            expect(getKey).toBeCalledWith(key);
            expect(result).toBe(cachedValue);
        });
    });

    describe('getMemoryCache', () => {
        it('should return memory cached value even if it is undefined', async () => {
            const key = 'key';

            const get = jest.spyOn(configDao.memoryCache, 'get');

            get.mockReturnValue(undefined);

            const result = await configDao.getMemoryCache(key);

            expect(get).toBeCalledTimes(1);
            expect(get).toBeCalledWith(key);
            expect(result).toBeFalsy();
        });

        it('should return memory cached value', async () => {
            const key = 'key';
            const cache = 'cache';

            const get = jest.spyOn(configDao.memoryCache, 'get');

            get.mockReturnValue(cache);

            const result = await configDao.getMemoryCache(key);

            expect(get).toBeCalledTimes(1);
            expect(get).toBeCalledWith(key);
            expect(result).toBe(cache);
        });
    });

    describe('getRedisCache', () => {
        it('should not cache into memory when redis cache does not exists', async () => {
            const key = 'key';
            const redisKey = 'redisKey';

            const getObject = jest.spyOn(redisDao, 'getObject');
            const getKey = jest.spyOn(configDao, 'getKey');
            
            getKey.mockReturnValue(redisKey);
            getObject.mockResolvedValue(undefined);

            const result = await configDao.getRedisCache(key);

            expect(getKey).toBeCalledTimes(1);
            expect(getKey).toBeCalledWith(key);
            expect(getObject).toBeCalledTimes(1);
            expect(getObject).toBeCalledWith(redisKey)
            expect(result).toBeFalsy();
        });

        it('should cache into memory when redis cache exists', async () => {
            const key = 'key';
            const redisKey = 'redisKey';
            const cache = 'cache';

            const getObject = jest.spyOn(redisDao, 'getObject');
            const getKey = jest.spyOn(configDao, 'getKey');
            const cacheIntoMemory = jest.spyOn(configDao, 'cacheIntoMemory');
            
            getKey.mockReturnValue(redisKey);
            getObject.mockResolvedValue(cache);
            cacheIntoMemory.mockImplementation(() => {});

            const result = await configDao.getRedisCache(key);

            expect(cacheIntoMemory).toBeCalledTimes(1);
            expect(cacheIntoMemory).toBeCalledWith(key, result);
            expect(getKey).toBeCalledTimes(1);
            expect(getKey).toBeCalledWith(key);
            expect(getObject).toBeCalledTimes(1);
            expect(getObject).toBeCalledWith(redisKey)
            expect(result).toBe(cache);
        });
    });

    describe('getKey', () => {
        it('should return a string representing redis key', async () => {
            const key = 'key';

            const oracle = `configuration:${key}`;

            const result = configDao.getKey(key);

            expect(result).toBe(oracle);
        });
    });
});