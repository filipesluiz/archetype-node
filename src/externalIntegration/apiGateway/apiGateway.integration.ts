import { BaseIntegration, APIConsume, BEARER_TOKENS, API_GTW_BEARER_TOKEN, APIResponse } from "../base.integration";
import { ApiGatewayAuthError } from "./apiGatewayAuth.exception";
import * as _ from 'lodash';
import { Inject } from "@nestjs/common";
import { RedisDao } from "../../redis/redis.dao";

export const API_GATEWAY_AUTH = 'AUTENTICACAO_API_GATEWAY';
export const API_GATEWAY_TOKEN = 'API_GATEWAY_TOKEN';
export const API_GATEWAY_UNAUTHORIZED = 401;

export class ApiGatewayIntegration extends BaseIntegration {
    context = ApiGatewayIntegration.name;

    private apiToken: string;

    @Inject() protected readonly redisDao: RedisDao;

    /**
     * Consome um serviço do api gateway.
     * Caso o bearer token não exista, o login é realizado.
     * Caso ocorra um 401, o login é realizado e a requisição é refeita apenas mais uma vez. 
     * @param consumeOptions Parametros da requisição
     */
    async consumeAPIGatewayService(consumeOptions: APIConsume): Promise<APIResponse> {
        try {
            const token = await this.getToken() || await this.loginApiGateway();
            const headers = await this.getHeaders(token);
            return await this.consumeJsonAPI({ ...consumeOptions, headers });
        } catch (err) {
            const status = _.get(err, 'response.status');
            if (status === API_GATEWAY_UNAUTHORIZED) {
                const token = await this.loginApiGateway();
                const headers = await this.getHeaders(token);
                return await this.consumeJsonAPI({ ...consumeOptions, headers });
            }

            throw err;
        }
    }
    
    /**
     * Faz login no api gateway. Necessário para consumir as apis internas.
     */
    async loginApiGateway(): Promise<string> {
        // Busca o bearer token da aplicação necessário para login
        const apiBearerToken = (await this.configurationDao.getDefaultConfiguration(BEARER_TOKENS, API_GTW_BEARER_TOKEN));
        const token = apiBearerToken.token;

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

        const result = await this.consumeJsonAPI(consumeOptions);
        const apiToken = _.get(result, 'data.access_token');

        if (!apiToken) {
            throw new ApiGatewayAuthError('Auth token does not exists');
        }

        return this.cacheToken(apiToken);
    }

    async cacheToken(token: string): Promise<string> {
        const result = await this.redisDao.set(API_GATEWAY_TOKEN, token);
        this.apiToken = result;
        return result;
    }

    async getToken(): Promise<string> {
        this.appLogger.debug({ code: 'API_TOKEN', memoryCacheHit: Boolean(this.apiToken) }, this.context);

        if (this.apiToken) {
            return this.apiToken;
        }

        const result = await this.redisDao.get(API_GATEWAY_TOKEN);
        this.apiToken = result;
        this.appLogger.debug({ code: 'API_TOKEN', redisCacheHit: Boolean(result) }, this.context);
        return result;
    }

    async getHeaders(token: string): Promise<any> {
        return {
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
        };
    }
}