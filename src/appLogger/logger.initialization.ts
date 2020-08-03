import { transports, format } from 'winston';
import { WinstonModule } from 'nest-winston';
import { removeNullAndUndefined } from '../util/base.util';
import { isLocal } from '../environment/env.initialization';

export function winstonLogger(subSystem?: string) {
    return WinstonModule.forRoot({
        level: 'debug',
        format: format.json(),
        transports: isLocal() ? devTransports(subSystem) : defaultTransports(subSystem),
    });
}

function devTransports(subSystem: string) {
    const alignColorsAndTime = format.combine(
        format.colorize({
            all:true,
        }),
        format.timestamp({
            format:"YY-MM-DD HH:MM:SS",
        }),
        format.printf(
            info => `[${info.timestamp}][${info.level}][${subSystem}][${info.context}]: ${info.message} ${info.trace || ''}`
        )
    );

    return [
        new transports.Console({
            format: format.combine(format.colorize(), alignColorsAndTime),
        }),
    ];
}

function defaultTransports(subSystem: string) {
    const myFormat = format.printf((info) => defaultFormat(info, subSystem));

    return [
        new transports.File({ filename: 'combined.log', format: myFormat }),
    ];
}

function defaultFormat(info, subSystem): string {
    const context = info.context;
    const level = info.level;
    const message = info.message;
    const messageObj = typeof message.message === 'string' ? { msg: message.message } : message.message;

    const requestId = message && message.requestId;

    const obj = { context, requestId, level, subSystem, msg: messageObj, trace: info.trace, '@timestamp': new Date() };
    return JSON.stringify(removeNullAndUndefined(obj));
}