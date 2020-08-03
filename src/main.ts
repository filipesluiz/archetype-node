import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppLogger } from './appLogger/app.logger';
import { AllExceptionsFilter } from './exceptionFilter/exception.filter';
import * as helmet from 'helmet';
import 'source-map-support/register';

export * from "./validation";
export * from "./appLogger";
export * from "./dao";
export * from "./app.module";
export * from "./testUtil";
export * from "./externalIntegration";
export * from "./requestLogger";

export async function bootstrap(port: number, path: string, appModule: any) {
    const app = await NestFactory.create(appModule);
    const loggerService = app.get(WINSTON_MODULE_NEST_PROVIDER);
    app.useGlobalFilters(new AllExceptionsFilter(new AppLogger(loggerService)));
    app.setGlobalPrefix(path);
    app.use(helmet());
    await app.listen(port);
}