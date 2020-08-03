import { RequestLoggingInterceptor } from "./request.interceptor";
import { AppLogger } from "../appLogger/app.logger";
import { of, throwError } from "rxjs";
import { createTestingModule } from "../testUtil/unitTest.util";

const generateExecutionContext = (request, statusCode) => ({
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ statusCode }) })
});

describe('RequestLoggingInterceptor', () => {
    let logger: AppLogger;
    let interceptor: RequestLoggingInterceptor;

    beforeEach(async () => {
        const moduleRef = await createTestingModule({
            providers: [RequestLoggingInterceptor]
        });

        logger = await moduleRef.resolve<AppLogger>(AppLogger);
        interceptor = moduleRef.get<RequestLoggingInterceptor>(RequestLoggingInterceptor);
    });

    describe('intercept', () => {
        it('should log a success response', async () => {
            const method = 'method';
            const url = 'url';
            const path = 'path';
            const originalUrl = 'originalUrl';
            const statusCode = 200;
            const date = 1234;

            const callHandler = {
                handle: () => of({})
            };

            const requestResponse = {
                method,
                url,
                path,
                originalUrl
            };

            const executionContext = generateExecutionContext(requestResponse, statusCode);

            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => date);
            const logResultSpy = jest.spyOn(interceptor, 'logResult').mockImplementation(() => {});

            const actualValue = interceptor.intercept(executionContext as any, callHandler as any);
            actualValue.subscribe({
                next: value => {
                    expect(logResultSpy).toHaveBeenCalledWith(method, undefined, url, path, originalUrl, undefined, 'call');
                    expect(logResultSpy).toHaveBeenCalledWith(method, statusCode, url, path, originalUrl, date, 'response');
                },
                error: error => {
                    fail('Should not execute catch block');
                },
                complete: () => {
                    expect(dateNowSpy).toHaveBeenCalledTimes(1);
                    expect(logResultSpy).toHaveBeenCalledTimes(2);
                }
            });
        });

        it('should log a error response with error status', async () => {
            const method = 'method';
            const url = 'url';
            const path = 'path';
            const originalUrl = 'originalUrl';
            const date = 1234;
            const errorStatus = 123;

            const callHandler = {
                handle: () => throwError({status: errorStatus})
            };

            const requestResponse = {
                method,
                url,
                path,
                originalUrl
            };

            const executionContext = generateExecutionContext(requestResponse, errorStatus);

            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => date);
            const logResultSpy = jest.spyOn(interceptor, 'logResult').mockImplementation(() => {});

            const actualValue = interceptor.intercept(executionContext as any, callHandler as any);
            actualValue.subscribe({
                next: value => {
                    fail('Should not execute success block');
                },
                error: error => {
                    expect(logResultSpy).toHaveBeenCalledWith(method, undefined, url, path, originalUrl, undefined, 'call');
                    expect(logResultSpy).toHaveBeenCalledWith(method, errorStatus, url, path, originalUrl, date, 'response', true);
                },
                complete: () => {
                    expect(dateNowSpy).toHaveBeenCalledTimes(1);
                    expect(logResultSpy).toHaveBeenCalledTimes(2);
                }
            });
        });

        it('should log a error response without error status', async () => {
            const method = 'method';
            const url = 'url';
            const path = 'path';
            const originalUrl = 'originalUrl';
            const date = 1234;
            const errorStatus = 500;

            const callHandler = {
                handle: () => throwError({status: undefined})
            };

            const requestResponse = {
                method,
                url,
                path,
                originalUrl
            };

            const executionContext = generateExecutionContext(requestResponse, errorStatus);

            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => date);
            const logResultSpy = jest.spyOn(interceptor, 'logResult').mockImplementation(() => {});

            const actualValue = interceptor.intercept(executionContext as any, callHandler as any);
            actualValue.subscribe({
                next: value => {
                    fail('Should not execute success block');
                },
                error: error => {
                    expect(logResultSpy).toHaveBeenCalledWith(method, undefined, url, path, originalUrl, undefined, 'call');
                    expect(logResultSpy).toHaveBeenCalledWith(method, errorStatus, url, path, originalUrl, date, 'response', true);
                },
                complete: () => {
                    expect(dateNowSpy).toHaveBeenCalledTimes(1);
                    expect(logResultSpy).toHaveBeenCalledTimes(2);
                }
            });
        });
    });

    describe('logResult', () => {
        it('should log success when is not a error', () => {
            const method = "method";
            const statusCode = "statusCode";
            const url = "url";
            const path = "path";
            const originalUrl = "originalUrl";
            const start = 1;
            const type = "type";
            const error = false;
            const ellapsedTimeInMilli = 1;

            const date = 2;

            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => date);
            const log = jest.spyOn(logger, 'log');

            interceptor.logResult(method, statusCode, url, path, originalUrl, start, type, error);

            expect(dateNowSpy).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith({ method, type, statusCode, url, path, originalUrl, ellapsedTimeInMilli });
        });

        it('should log error when is a error', () => {
            const method = "method";
            const statusCode = "statusCode";
            const url = "url";
            const path = "path";
            const originalUrl = "originalUrl";
            const start = 1;
            const type = "type";
            const error = true;
            const ellapsedTimeInMilli = 1;

            const date = 2;

            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => date);
            const log = jest.spyOn(logger, 'error');

            interceptor.logResult(method, statusCode, url, path, originalUrl, start, type, error);

            expect(dateNowSpy).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith({ method, type, statusCode, url, path, originalUrl, ellapsedTimeInMilli });
        });
    })
})