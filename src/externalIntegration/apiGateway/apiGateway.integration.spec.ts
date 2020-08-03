import { createTestingModule } from "../../testUtil/unitTest.util";
import { ContextIdFactory } from "@nestjs/core";
import { ApiGatewayIntegration, API_GATEWAY_AUTH, API_GATEWAY_TOKEN } from "./apiGateway.integration";
import { APIConsume, BEARER_TOKENS, API_GTW_BEARER_TOKEN } from "../base.integration";
import { ConfigurationDao } from "../../configuration/configuration.dao";
import { AuditDao } from "../../audit/audit.dao";
import { ApiGatewayAuthError } from "./apiGatewayAuth.exception";
import { RedisDao } from "../../redis/redis.dao";

describe('APIGateway', () => {
    let integration;
    let configurationDao;
    let redisDao;

    beforeEach(async () => {
        const contextId = ContextIdFactory.create();
        jest
          .spyOn(ContextIdFactory, 'getByRequest')
          .mockImplementation(() => contextId);

        const moduleRef = await createTestingModule({
            providers: [
                AuditDao,
                ConfigurationDao,
                ApiGatewayIntegration
            ]
        });

        integration = await moduleRef.resolve<ApiGatewayIntegration>(ApiGatewayIntegration, contextId);
        configurationDao = await moduleRef.resolve<ConfigurationDao>(ConfigurationDao, contextId);
        redisDao = moduleRef.get<RedisDao>(RedisDao);
    });

    describe('consumeAPIGatewayService', () => {
        it('should get cached token when exists', async () => {
            const token = 'token';
            const headers = 'headers';
            const apiResult = 'apiResult';
            const consumeOptions = {} as APIConsume;

            const getToken = jest.spyOn(integration, 'getToken');
            const getHeaders = jest.spyOn(integration, 'getHeaders');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');

            getToken.mockResolvedValue(token);
            getHeaders.mockResolvedValue(headers);
            consumeJsonAPI.mockResolvedValue(apiResult);

            const result = await integration.consumeAPIGatewayService(consumeOptions);

            expect(getToken).toBeCalledTimes(1);
            expect(getHeaders).toBeCalledTimes(1);
            expect(getHeaders).toBeCalledWith(token);
            expect(consumeJsonAPI).toBeCalledTimes(1);
            expect(consumeJsonAPI).toBeCalledWith({ ...consumeOptions, headers });

            expect(result).toBe(apiResult);
        });

        it('should login when cached token does not exists', async () => {
            const token = 'token';
            const headers = 'headers';
            const apiResult = 'apiResult';
            const consumeOptions = {} as APIConsume;

            const getToken = jest.spyOn(integration, 'getToken');
            const getHeaders = jest.spyOn(integration, 'getHeaders');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');
            const loginApiGateway = jest.spyOn(integration, 'loginApiGateway');

            getToken.mockResolvedValue(undefined);
            getHeaders.mockResolvedValue(headers);
            consumeJsonAPI.mockResolvedValue(apiResult);
            loginApiGateway.mockResolvedValue(token);

            const result = await integration.consumeAPIGatewayService(consumeOptions);

            expect(getToken).toBeCalledTimes(1);
            expect(getHeaders).toBeCalledTimes(1);
            expect(getHeaders).toBeCalledWith(token);
            expect(consumeJsonAPI).toBeCalledTimes(1);
            expect(consumeJsonAPI).toBeCalledWith({ ...consumeOptions, headers });

            expect(result).toBe(apiResult);
        });

        it('should consult again when a 401 error occurs', async () => {
            const token = 'token';
            const newToken = 'newToken';
            const headers = 'headers';
            const status = 401;
            const apiResultError = { response: { status } };
            const apiResultSuccess = 'apiResultSuccess';
            const consumeOptions = {} as APIConsume;

            const getToken = jest.spyOn(integration, 'getToken');
            const getHeaders = jest.spyOn(integration, 'getHeaders');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');
            const loginApiGateway = jest.spyOn(integration, 'loginApiGateway');

            getToken.mockResolvedValue(token);
            getHeaders.mockResolvedValue(headers);
            consumeJsonAPI.mockRejectedValueOnce(apiResultError);
            consumeJsonAPI.mockResolvedValue(apiResultSuccess);
            loginApiGateway.mockResolvedValue(newToken);

            const result = await integration.consumeAPIGatewayService(consumeOptions);

            expect(getToken).toBeCalledTimes(1);
            expect(getToken).toBeCalledWith();
            expect(getHeaders).toBeCalledTimes(2);
            expect(getHeaders).toBeCalledWith(token);
            expect(getHeaders).toBeCalledWith(newToken);
            expect(consumeJsonAPI).toBeCalledTimes(2);
            expect(consumeJsonAPI).toBeCalledWith({ ...consumeOptions, headers });
            expect(loginApiGateway).toBeCalledTimes(1);
            expect(loginApiGateway).toBeCalledWith();

            expect(result).toBe(apiResultSuccess);
        });

        it('should throw exception when error different from 401 ocurrs', async () => {
            const token = 'token';
            const headers = 'headers';
            const status = 403;
            const apiResultError = { response: { status } };
            const apiResultSuccess = 'apiResultSuccess';
            const consumeOptions = {} as APIConsume;

            const getToken = jest.spyOn(integration, 'getToken');
            const getHeaders = jest.spyOn(integration, 'getHeaders');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');

            getToken.mockResolvedValue(token);
            getHeaders.mockResolvedValue(headers);
            consumeJsonAPI.mockRejectedValueOnce(apiResultError);
            consumeJsonAPI.mockResolvedValue(apiResultSuccess);

            try {
                await integration.consumeAPIGatewayService(consumeOptions);
            } catch (err) {
                expect(err).toStrictEqual(apiResultError);
            }

            expect(getToken).toBeCalledTimes(1);
            expect(getToken).toBeCalledWith();
            expect(getHeaders).toBeCalledTimes(1);
            expect(getHeaders).toBeCalledWith(token);
            expect(consumeJsonAPI).toBeCalledTimes(1);
            expect(consumeJsonAPI).toBeCalledWith({ ...consumeOptions, headers });
        });
    });

    describe('loginApiGateway', () => {
        it('should throw exception when api token is undefined', async () => {
            const token = 'token';
            const access_token = undefined;
            const apiBearerToken = { token };
            const result = { data: { access_token } };

            const consumeOptions = {
                configAddressKey: API_GATEWAY_AUTH,
                headers: {
                    'authorization': `Basic ${token}`,
                    'content-type': 'application/x-www-form-urlencoded',
                },
                options: {
                    method: 'POST',
                },
            } as APIConsume;

            const getDefaultConfiguration = jest.spyOn(configurationDao, 'getDefaultConfiguration');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');

            getDefaultConfiguration.mockResolvedValue(apiBearerToken);
            consumeJsonAPI.mockResolvedValue(result);

            try {
                await integration.loginApiGateway();
            } catch (err) {
                expect(err).toBeInstanceOf(ApiGatewayAuthError);
            }

            expect(consumeJsonAPI).toBeCalledTimes(1);
            expect(consumeJsonAPI).toBeCalledWith(consumeOptions);
            expect(getDefaultConfiguration).toBeCalledTimes(1);
            expect(getDefaultConfiguration).toBeCalledWith(BEARER_TOKENS, API_GTW_BEARER_TOKEN);
        });

        it('should save and return token when it exists', async () => {
            const token = 'token';
            const access_token = 'access_token';
            const apiBearerToken = { token };
            const result = { data: { access_token } };
            const consumeOptions = {
                configAddressKey: API_GATEWAY_AUTH,
                headers: {
                    'authorization': `Basic ${token}`,
                    'content-type': 'application/x-www-form-urlencoded',
                },
                options: {
                    method: 'POST',
                },
            } as APIConsume;
            const oracle = 'oracle';

            const getDefaultConfiguration = jest.spyOn(configurationDao, 'getDefaultConfiguration');
            const consumeJsonAPI = jest.spyOn(integration, 'consumeJsonAPI');
            const cacheToken = jest.spyOn(integration, 'cacheToken');

            getDefaultConfiguration.mockResolvedValue(apiBearerToken);
            consumeJsonAPI.mockResolvedValue(result);
            cacheToken.mockResolvedValue(oracle);
            
            const finalResult = await integration.loginApiGateway();
            expect(finalResult).toBe(oracle);
            
            expect(cacheToken).toBeCalledTimes(1);
            expect(cacheToken).toBeCalledWith(access_token);
            expect(consumeJsonAPI).toBeCalledTimes(1);
            expect(consumeJsonAPI).toBeCalledWith(consumeOptions);
            expect(getDefaultConfiguration).toBeCalledTimes(1);
            expect(getDefaultConfiguration).toBeCalledWith(BEARER_TOKENS, API_GTW_BEARER_TOKEN);
        });
    });

    describe('cacheToken', () => {
        it('should cache token', async () => {
            const token = 'token';

            const set = jest.spyOn(redisDao, 'set');

            set.mockResolvedValue(token);

            await integration.cacheToken(token);

            expect(set).toBeCalledTimes(1);
            expect(set).toBeCalledWith(API_GATEWAY_TOKEN, token);
            expect(integration.apiToken).toBe(token);
        });
    });

    describe('getToken', () => {
        it('should get redis cached token when it is not in memory', async () => {
            const cached = 'result';

            const get = jest.spyOn(redisDao, 'get');

            get.mockResolvedValue(cached);

            const result = await integration.getToken();

            expect(get).toBeCalledTimes(1);
            expect(get).toBeCalledWith(API_GATEWAY_TOKEN);
            expect(result).toBe(cached);
            expect(integration.apiToken).toBe(result);
        });

        it('should return memory cached token when it exists', async () => {
            const cached = 'result';

            const get = jest.spyOn(redisDao, 'get');

            get.mockResolvedValue(cached);

            integration.apiToken = cached;

            const result = await integration.getToken();

            expect(get).toBeCalledTimes(0);
            expect(result).toBe(cached);
        });
    });

    describe('getHeaders', () => {
        it('should build headers', async () => {
            const token = 'token';

            const headers = {
                'authorization': `Bearer ${token}`,
                'content-type': 'application/json',
            };

            const result = await integration.getHeaders(token);

            expect(result).toStrictEqual(headers);
        });
    });
});