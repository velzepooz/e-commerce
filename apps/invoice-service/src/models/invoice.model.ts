import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Invoice } from '../types/invoice-repository.types';

const INVOICE_COLLECTION_NAME = 'Invoices';

export type InvoiceDocument = InvoiceModel & Document<string>;

@Schema({
  collection: INVOICE_COLLECTION_NAME,
  timestamps: true,
  versionKey: false,
})
export class InvoiceModel extends Document<string> implements Invoice {
  @Prop({ required: true, unique: true, index: true })
  orderId: string;

  @Prop({ required: true, unique: true, index: true })
  url: string;

  @Prop({ required: false, default: null, type: Date })
  sentAt: Date | null;
}

export const InvoiceSchema = SchemaFactory.createForClass(InvoiceModel);
