import { Injectable, Inject } from "@nestjs/common";
import { Audit } from "./audit.model";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { AppLogger } from "../appLogger/app.logger";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";

@Injectable()
export class AuditDao {
    constructor(
        @InjectModel(Audit.name) private readonly model: Model<Audit>,
        private readonly appLogger: AppLogger,
        @Inject(REQUEST) public request?: Request
    ) {
        this.appLogger.setContext(AuditDao.name);
    }

    async insertAudit(code: string, data: any, result: any, success: boolean): Promise<void> {
        const requestId =  this.request['id'];

        const audit = { code, data, result, success, requestId };

        this.appLogger.log(audit, 'AuditInsertion');
        (new this.model(audit)).save();
    }
}