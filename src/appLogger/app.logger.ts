import { Injectable, Inject, LoggerService, Scope } from "@nestjs/common";
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { REQUEST } from "@nestjs/core";
import { Request } from 'express';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
    private context: string;

    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
        @Inject(REQUEST) public request?: Request
    ) {}

    error(message: any, trace?: string, context?: string): void {
        this.logger.error(this.setRequestId(message), trace, context || this.context);
    }

    warn(message: any, context?: string): void {
        this.logger.warn(this.setRequestId(message), context || this.context);
    }

    debug?(message: any, context?: string): void {
        this.logger.debug(this.setRequestId(message), context || this.context);
    }

    verbose?(message: any, context?: string): void {
        this.logger.verbose(this.setRequestId(message), context || this.context);
    }

    log(message: any, context?: string): void {
        this.logger.log(this.setRequestId(message), context || this.context)
    }

    setContext(context: string): void {
        this.context = context;
    }

    setRequest(request: Request): void {
        this.request = request;
    }

    private setRequestId(message: any): any {
        if (this.request == null) {
            return message;
        }

        const requestId: string = this.request['id'];

        return { message, requestId };
    }
}