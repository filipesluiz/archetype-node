import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLogger } from '../appLogger/app.logger';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLogger) { 
        logger.setContext(this.constructor.name);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const req = ctx.getRequest();

        const method = req.method;
        const url = req.url;
        const path = req.path;
        const originalUrl = req.originalUrl;

        this.logResult(method, undefined, url, path, originalUrl, undefined, 'call');

        const start = Date.now();
        return next
            .handle()
            .pipe(
                tap(() => {
                    const statusCode = ctx.getResponse().statusCode;
                    this.logResult(method, statusCode, url, path, originalUrl, start, 'response');
                }),
                catchError((err: any) => {
                    const statusCode = err.status || 500;
                    this.logResult(method, statusCode, url, path, originalUrl, start, 'response', true);
                    return throwError(err);
                }),
            );
    }

    logResult(method: string, statusCode: string, url: string,
        path: string, originalUrl: string, start: number, type: string,
        error?: boolean) {
        const end = Date.now();
        const ellapsedTimeInMilli = end - start;

        this.logger[`${error ? 'error' : 'log'}`]({ method, type, statusCode, url, path, originalUrl, ellapsedTimeInMilli });
    }
}