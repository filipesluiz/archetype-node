import { RedisModule } from 'nestjs-redis';
import { DynamicModule } from '@nestjs/common';

export function initRedis(): DynamicModule {
    return RedisModule.forRootAsync({
        useFactory: () => {
            return {};
        },
        imports: [],
    });
}