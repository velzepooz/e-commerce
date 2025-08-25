import { Injectable } from '@nestjs/common';
import { Faker } from '@app/shared';
import { Invoice } from '../../src/types/invoice-repository.types';
import { TestingModule } from '@nestjs/testing';
import { InvoiceRepository } from '../../src/repositories/invoice.repository';

export type createInvoiceType = {
  orderId?: string;
  url?: string;
  sentAt?: Date | null;
  onlyData?: boolean;
};

@Injectable()
export class InvoiceFactory {
  constructor(private readonly _moduleRef: TestingModule) {}

  async create({
    orderId = Faker.mongoId().toString(),
    url = Faker.url(),
    sentAt = null,
    onlyData = false,
  }: createInvoiceType): Promise<Invoice> {
    if (onlyData) {
      return {
        orderId,
        url,
        sentAt,
        _id: Faker.mongoId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Invoice;
    }

    const modelRef = this._moduleRef.get<InvoiceRepository>(InvoiceRepository);
    return await modelRef.create({
      orderId,
      url,
      sentAt,
    });
  }
}
