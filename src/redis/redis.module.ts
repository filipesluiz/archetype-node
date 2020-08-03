import { Global, Module } from "@nestjs/common";
import { initRedis } from "./redis.initialization";
import { RedisDao } from "./redis.dao";

@Global()
@Module({
    imports: [initRedis()],
    providers: [RedisDao],
    exports: [RedisDao],
})
export class RedisModule {}