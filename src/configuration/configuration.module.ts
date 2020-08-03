import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Configuration, ConfigurationSchema } from './configuration.model';
import { ConfigurationDao } from './configuration.dao';


@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Configuration.name, schema: ConfigurationSchema },
        ]),
    ],
    providers: [ConfigurationDao],
    exports: [ConfigurationDao],
})
export class ConfigurationModule {}
