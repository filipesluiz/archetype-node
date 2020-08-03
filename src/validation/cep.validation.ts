import { registerDecorator, ValidationOptions } from "class-validator";
import { isValidCEP } from '@brazilian-utils/brazilian-utils';
 
export function IsCepValid(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string) {
        registerDecorator({
            name: "IsCepValid",
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === "string" && isValidCEP(value); // you can return a Promise<boolean> here as well, if you want to make async validation
                },
            },
        });
    };
}