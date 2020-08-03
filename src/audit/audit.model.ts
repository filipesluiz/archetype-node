import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Audit extends Document {
    @Prop()
    code: string;

    @Prop()
    data: any;

    @Prop()
    result: any;

    @Prop()
    success: boolean;

    @Prop()
    requestId: string;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);