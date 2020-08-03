import { Injectable } from "@nestjs/common";
import { APIConsume, APIResponse } from "../base.integration";
import { ApiGatewayIntegration } from "../apiGateway/apiGateway.integration";

export class AsyncCallbackError extends Error {}

export interface APIStatus {
    status: Status;
    remainingTime: number;
}

export type Status = 'READY_TO_START' | 'PROCESSING' | 'SUCCESS' | 'TIMEOUT';

@Injectable()
export class AsyncIntegration extends ApiGatewayIntegration {
    constructor() {
        super();
    }

    async consumeAsyncAPI(id: string, apiConsume: APIConsume, callbackTimeout: number, context?: any): Promise<{ response?: APIResponse, status: APIStatus }> {
        const currentStatus = await this.getContext(id, callbackTimeout);
        if (currentStatus.status !== 'READY_TO_START') {
            return { status: currentStatus };
        }

        const redisObj = this.buildContext(context, callbackTimeout);

        const result = await this.consumeAPIGatewayService(apiConsume);

        await this.redisDao.setObject(id, redisObj);
        return { response: result, status: currentStatus };
    }

    async end(id: string, result: any): Promise<any> {
        const { status } = await this.getContext(id);

        if (status === 'PROCESSING') {
            return this.redisDao.updateObject(id, { callbackResult: result });
        }

        throw new AsyncCallbackError('Callback not expected');
    }

    async getContext(id: string, callbackTimeout?: number): Promise<APIStatus> {
        const redisObj = await this.redisDao.getObject(id);

        if (!redisObj) {
            return { status: 'READY_TO_START', remainingTime: callbackTimeout };
        }

        const { endTime, callbackResult } = redisObj;
        const now = Date.now();
        const diff = endTime - now;
        const remainingTime = diff < 0 ? 0 : diff;

        const status = this.getStatus(remainingTime, callbackResult);

        return { status, remainingTime };
    }

    getStatus(remainingTime, callbackResult): Status {
        const hasTimeFinished = remainingTime <= 0;

        if (callbackResult) {
            return hasTimeFinished ? 'SUCCESS' : 'PROCESSING'; 
        }

        return hasTimeFinished ? 'TIMEOUT' : 'PROCESSING';
    }

    buildContext(context: any, timeout: number) {
        const now = Date.now();

        return {
            context,
            endTime: now + timeout,
        };
    }
}