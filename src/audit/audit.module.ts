import { Module, Global } from '@nestjs/common';
import { AuditDao } from './audit.dao';
import { Audit, AuditSchema } from './audit.model';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([{ name: Audit.name, schema: AuditSchema }]),
    ],
    providers: [AuditDao],
    exports: [AuditDao],
})
export class AuditModule {}
