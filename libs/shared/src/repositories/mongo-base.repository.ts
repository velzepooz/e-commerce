import mongoose, { Collection, FilterQuery, Model } from 'mongoose';
import { IdType, MongoBaseType } from '../types';
import { convertToObjectId } from '../utils';

export abstract class MongoBaseRepository<TModel extends MongoBaseType> {
  protected get _query(): Collection {
    return this._model.collection;
  }

  constructor(protected readonly _model: Model<TModel>) {}

  async findById(id: IdType): Promise<TModel | null> {
    return this._model.findById(convertToObjectId(id)).lean<TModel>();
  }

  async findByIds<TResult = TModel>(ids: IdType[]): Promise<TResult[]> {
    return this._model
      .find({ _id: { $in: ids.map(convertToObjectId) } })
      .lean<TResult[]>();
  }

  async create(data: Partial<TModel>): Promise<TModel> {
    return (await this._model.create(data)).toJSON() as TModel;
  }

  async find(data: Partial<TModel>): Promise<TModel[]> {
    const query = this._model.find(data);

    return query.lean<TModel[]>();
  }

  async findOne(data: Partial<TModel>): Promise<TModel | null> {
    return this._model.findOne(data).lean<TModel>();
  }

  async findOneAndUpdate(
    filter: Partial<TModel>,
    updatedData: Partial<TModel>,
  ): Promise<TModel | null> {
    return this._model
      .findOneAndUpdate(filter, updatedData, {
        new: true,
      })
      .lean<TModel>();
  }

  async update(id: IdType, data: Partial<TModel>): Promise<TModel | null> {
    return this._model
      .findOneAndUpdate(
        { _id: convertToObjectId(id) },
        { ...data },
        { new: true },
      )
      .lean<TModel>();
  }

  async updateMany(
    filter: Partial<TModel>,
    data: Partial<TModel>,
  ): Promise<TModel> {
    return this._model.updateMany(filter, data).lean<TModel>();
  }

  async updateBulk(
    updateBulk: {
      id: IdType;
      data: Partial<TModel>;
    }[],
  ): Promise<void> {
    const writeData: mongoose.AnyBulkWriteOperation[] = updateBulk.map(
      ({ id, data }) => ({
        updateOne: {
          filter: { _id: convertToObjectId(id) as unknown },
          update: {
            ...data,
          },
          upsert: true,
        },
      }),
    );

    await this._model.bulkWrite(writeData);
  }

  delete(ids: IdType[]): Promise<mongoose.mongo.DeleteResult> {
    return this._model.deleteMany({ _id: ids.map(convertToObjectId) });
  }

  deleteMany(filter?: FilterQuery<TModel>) {
    return this._model.deleteMany(filter);
  }

  async createMany(data: Partial<TModel>[]): Promise<TModel[]> {
    return await this._model
      .create(data)
      .then((res) => res.map((r) => r.toJSON() as TModel));
  }

  /**
   * Create or update a document in the collection.
   * @param data the data to be created or updated
   * @param filter the filter to find the document to update. If not provided, the data will be used as filter.
   * @returns the created or updated document
   */
  async upsert(
    data: Partial<TModel>,
    filter?: Partial<TModel>,
  ): Promise<TModel> {
    const doc = await this._model
      .findOneAndUpdate(
        filter || data,
        { ...data },
        { upsert: true, new: true },
      )
      .lean();

    return doc as TModel;
  }

  async exists(item: Partial<TModel>) {
    const doc = await this._model.exists(item);

    return !!doc;
  }

  generateObjectId(): string {
    return new mongoose.Types.ObjectId().toString();
  }
}
