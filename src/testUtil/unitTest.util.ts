/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from "@nestjs/testing";
import { AppLogger } from "../appLogger/app.logger";
import { Request } from "express";
import { ModuleMetadata } from "@nestjs/common/interfaces";
import { HttpService } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Audit } from "../audit/audit.model";
import { Configuration } from "../configuration/configuration.model";
import { RedisDao } from "../redis/redis.dao";

const MockedLogger = {
    error: function (message: any, trace?: string, context?: string) {},
    warn: function (message: any, context?: string) {},
    debug: function (message: any, context?: string) {},
    verbose: function (message: any, context?: string) {},
    log: function (message: any, context?: string) {},
    setContext: function (context: string) {},
    setRequest: function (request: Request) {},
    setRequestId: function (message: any) {},
} as unknown as AppLogger;

const MockedHttpService = {
    request: async () => {},
} as unknown as HttpService;

const MockedRedisDao = {
    getObject: async (key: string) => {},
    setObject: async (key: string, value: any, ttl?: number) => {},
    set: async (key: string, value: any, ttl: number) => {},
    get: async (key: string) => {},
    getClient: (name?: string) => {},
    getClients: () => {},
} as unknown as RedisDao;

const MockedSchema = {
    findOne: async () => {},
};

export function createE2ETestingModule(metadata: ModuleMetadata) {
    const { providers } = metadata;
    const newProviders = [
        ...providers,
        AppLogger,
    ];

    return Test.createTestingModule({ ...metadata, providers: newProviders })
        .overrideProvider(AppLogger)
        .useValue(MockedLogger)
        .overrideProvider(HttpService)
        .useValue(MockedHttpService)
        .overrideProvider(RedisDao)
        .useValue(MockedRedisDao);
}

export function createTestingModule({ providers = [], imports = [], controllers = [], exports = [] }: ModuleMetadata = {}, mockedModels = []) {
    const changedProviders = [
        { provide: AppLogger, useValue: MockedLogger },
        { provide: HttpService, useValue: MockedHttpService },
        { provide: RedisDao, useValue: MockedRedisDao },
        ...createMockedModels(mockedModels),
        ...providers,
    ];

    return Test.createTestingModule({ providers: changedProviders, imports, controllers, exports }).compile();
}

function createMockedModels(models) {
    return [Configuration.name, Audit.name, ...models].map((model) => ({ provide: getModelToken(model), useValue: MockedSchema }));
}