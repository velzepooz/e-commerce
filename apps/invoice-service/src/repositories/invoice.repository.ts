import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InvoiceDocument, InvoiceModel } from '../models/invoice.model';
import { Model } from 'mongoose';
import { MongoBaseRepository } from '@app/shared';

@Injectable()
export class InvoiceRepository extends MongoBaseRepository<InvoiceModel> {
  constructor(@InjectModel(InvoiceModel.name) _model: Model<InvoiceDocument>) {
    super(_model);
  }
}
