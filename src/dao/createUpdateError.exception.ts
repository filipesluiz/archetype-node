import { HttpException, HttpStatus } from "@nestjs/common";

export class DaoCreateUpdateError extends HttpException {
    constructor() {
        super('DaoCreateUpdateError', HttpStatus.BAD_REQUEST);
    }
}