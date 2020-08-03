/* eslint-disable @typescript-eslint/no-unused-vars */
import { createTestingModule } from "../testUtil/unitTest.util";
import { LoggerService } from "@nestjs/common";
import { AppLogger } from "./app.logger";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { Request } from "express";
import { REQUEST } from "@nestjs/core";

const MockedLogger = {
    log: function (message: any, context?: string) {},
    error: function (message: any, trace?: string, context?: string) {},
    warn: function (message: any, context?: string) {},
    debug: function (message: any, context?: string) {},
    verbose: function (message: any, context?: string) {},
} as LoggerService;

const requestId = 'requestId';
const MockedRequest = {
    id: requestId
} as unknown as Request;

describe('AppLogger without Request', () => {
    let logger: AppLogger;
    let mockedLogger: LoggerService;

    beforeEach(async () => {
        const moduleRef = await createTestingModule({
            providers: [AppLogger, { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: MockedLogger }]
        });

        logger = await moduleRef.resolve<AppLogger>(AppLogger);
        mockedLogger = moduleRef.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
    });

    it('should log error without context', () => {
        const message = 'message';
        const trace = 'trace';
        const context = 'context';

        const error = jest.spyOn(mockedLogger, 'error');

        logger.error(message, trace, context);

        expect(error).toBeCalledWith(message, trace, context);
        expect(error).toBeCalledTimes(1);
    });

    it('should log warn without context', () => {
        const message = 'message';
        const context = 'context';

        const warn = jest.spyOn(mockedLogger, 'warn');

        logger.warn(message, context);

        expect(warn).toBeCalledWith(message, context);
        expect(warn).toBeCalledTimes(1);
    });

    it('should log debug without context', () => {
        const message = 'message';
        const context = 'context';

        const debug = jest.spyOn(mockedLogger, 'debug');

        logger.debug(message, context);

        expect(debug).toBeCalledWith(message, context);
        expect(debug).toBeCalledTimes(1);
    });

    it('should log verbose without context', () => {
        const message = 'message';
        const context = 'context';

        const verbose = jest.spyOn(mockedLogger, 'verbose');

        logger.verbose(message, context);

        expect(verbose).toBeCalledWith(message, context);
        expect(verbose).toBeCalledTimes(1);
    });

    it('should log log without context', () => {
        const message = 'message';
        const context = 'context';

        const log = jest.spyOn(mockedLogger, 'log');

        logger.log(message, context);

        expect(log).toBeCalledWith(message, context);
        expect(log).toBeCalledTimes(1);
    });

    it('should set Context', () => {
        const context = 'context';

        logger.setContext(context);
    });

    it('should set Request', () => {
        const request = {  } as Request;

        logger.setRequest(request);
    });
})

describe('AppLogger with Request', () => {
    let logger: AppLogger;
    let mockedLogger: LoggerService;

    beforeEach(async () => {
        const moduleRef = await createTestingModule({
            providers: [
                AppLogger,
                { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: MockedLogger },
                { provide: REQUEST, useValue: MockedRequest }
            ]
        });

        logger = await moduleRef.resolve<AppLogger>(AppLogger);
        mockedLogger = moduleRef.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
    });

    it('should log error with context', () => {
        const message = 'message';
        const trace = 'trace';
        const context = 'context';

        const messageObj = { message, requestId };

        const error = jest.spyOn(mockedLogger, 'error');

        logger.setContext(context);
        logger.error(message, trace);

        expect(error).toBeCalledWith(messageObj, trace, context);
        expect(error).toBeCalledTimes(1);
    });

    it('should log warn with context', () => {
        const message = 'message';
        const context = 'context';

        const messageObj = { message, requestId };

        const warn = jest.spyOn(mockedLogger, 'warn');

        logger.setContext(context);
        logger.warn(message);

        expect(warn).toBeCalledWith(messageObj, context);
        expect(warn).toBeCalledTimes(1);
    });

    it('should log debug with context', () => {
        const message = 'message';
        const context = 'context';

        const messageObj = { message, requestId };

        const debug = jest.spyOn(mockedLogger, 'debug');

        logger.setContext(context);
        logger.debug(message);

        expect(debug).toBeCalledWith(messageObj, context);
        expect(debug).toBeCalledTimes(1);
    });

    it('should log verbose with context', () => {
        const message = 'message';
        const context = 'context';

        const messageObj = { message, requestId };

        const verbose = jest.spyOn(mockedLogger, 'verbose');

        logger.setContext(context);
        logger.verbose(message);

        expect(verbose).toBeCalledWith(messageObj, context);
        expect(verbose).toBeCalledTimes(1);
    });

    it('should log log with context', () => {
        const message = 'message';
        const context = 'context';

        const messageObj = { message, requestId };

        const log = jest.spyOn(mockedLogger, 'log');

        logger.setContext(context);
        logger.log(message);

        expect(log).toBeCalledWith(messageObj, context);
        expect(log).toBeCalledTimes(1);
    });

    it('should set Context', () => {
        const context = 'context';

        logger.setContext(context);
    });

    it('should set Request', () => {
        const request = {  } as Request;

        logger.setRequest(request);
    });
})