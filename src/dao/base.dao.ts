/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* tslint:disable:variable-name */
import { Model, Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { DaoCreateUpdateError } from './createUpdateError.exception';

export class BaseDao<T extends Document, K extends { _id?: string }> {
    protected model: Model<T>;

    protected constructor(model: Model<T>) {
        this.model = model;
    }

    find(query: any, populateAttributes?: string[]): Promise<T[]> {
        return this._populate(this.model.find(query), populateAttributes);
    }

    findOne(query: any, populateAttributes?: string[]): Promise<T> {
        return this._populate(this.model.findOne(query), populateAttributes);
    }

    findAll(populateAttributes?: string[]): Promise<T[]> {
        return this._populate(this.model.find(), populateAttributes);
    }

    // tslint:disable-next-line:variable-name
    findOneById(_id: string, populateAttributes?: string[]): Promise<T> {
        const isValid = this.isObjectIdValid(_id);

        return isValid ? this._populate(this.model.findOne({ _id } as any), populateAttributes) : {};
    }

    async create(obj: K): Promise<T> {
        return (new this.model(obj)).save();
    }

    async createMany(objs: K[]): Promise<any> {
        const bulk = this.model.collection.initializeOrderedBulkOp();

        objs.forEach((obj) => bulk.insert(obj));

        return bulk.execute();
    }

    async deleteById(_id: string): Promise<any> {
        return await this.model.findOneAndRemove({ _id } as any);
    }

    updateByQuery(_id: string, attributes: any, populateAttributes?: string[]): Promise<T> {
        return this._populate(this.model.findOneAndUpdate({ _id } as any, { $set: attributes } as any, { new: true }), populateAttributes);
    }

    async update(obj: K): Promise<T> {
        if (obj == null || obj._id == null) {
            throw new DaoCreateUpdateError();
        }

        const updated = await this.updateByQuery(obj._id, obj);
        if (!updated) {
            throw new DaoCreateUpdateError();
        }

        return updated;
    }

    async updateMany(objs: K[]): Promise<any> {
        const bulk = this.model.collection.initializeOrderedBulkOp();

        objs.forEach((obj) => {
            // tslint:disable-next-line:variable-name
            const _id = mongoose.Types.ObjectId(obj._id);
            delete obj._id;
            bulk.find({ _id }).update({ $set: obj });
        });

        return bulk.execute();
    }

    _populate(queryResult, attributes = []): any {
        if (queryResult) {
            return attributes.reduce((_queryResult, attribute) => _queryResult.populate(attribute), queryResult);
        }

        return queryResult;
    }

    isObjectIdValid(objectId: string) {
        return mongoose.Types.ObjectId.isValid(objectId);
    }
}
