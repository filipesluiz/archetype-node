import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Configuration extends Document {
    @Prop()
    name: string;

    @Prop()
    value: any;
}

export const ConfigurationSchema = SchemaFactory.createForClass(Configuration);