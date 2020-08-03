import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppService } from './app.service';
import { AppLogger } from './appLogger/app.logger';
import { UIDMiddleware } from './uid/uid.middleware';
import { initMongo } from './mongo/mongo.initialization';
import { AppLoggerModule } from './appLogger/app.logger.module';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from './validation/validation.pipe';
import { ConfigurationModule } from './configuration/configuration.module';
import { AuditModule } from './audit/audit.module';
import { AppController } from './app.controller';
import { RedisModule } from './redis/redis.module';

export const imports = [
    AppLoggerModule,
    ConfigurationModule,
    AuditModule,
    RedisModule,
    initMongo(),
];

export const providers = [
    AppService,
    AppLogger,
    { provide: APP_PIPE, useClass: ValidationPipe },
];

export const controllers = [
    AppController,
];

export class AppCoreModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(UIDMiddleware).forRoutes('/');
    }
}
