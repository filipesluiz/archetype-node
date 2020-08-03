import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { AppLogger } from '../appLogger/app.logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly logger: AppLogger) {
        logger.setContext(this.constructor.name);
    }

    catch(exception: { message: string; stack: string }, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.setRequest(request);
            this.logger.error(exception.message, exception.stack);
        }

        response.status(status).json({
            statusCode: status,
            message: exception instanceof BadRequestException && exception.message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
