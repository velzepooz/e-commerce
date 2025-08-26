import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { S3Service } from '@app/s3';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../types/invoice-repository.types';
import {
  ContentDispositionEnum,
  IUploadedFile,
  OrderStatusEnum,
  type ContentDisposition,
} from '@app/shared';
import { getInvoicesType } from '../types/invoice-service.types';
import { OrderProjectionService } from './order-projection.service';

@Injectable()
export class InvoiceService {
  private readonly _logger = new Logger(InvoiceService.name);
  private readonly _bucketName: string;
  private readonly _defaultUrlTtlSec: number;

  constructor(
    private readonly _s3Service: S3Service,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _configService: ConfigService,
    private readonly _orderProjectionService: OrderProjectionService,
  ) {
    this._bucketName =
      this._configService.get<string>('INVOICE_BUCKET_NAME') || 'invoice';
    this._defaultUrlTtlSec =
      this._configService.get<number>('S3_URL_TTL_SEC_DEFAULT') || 5 * 60;
  }

  async uploadInvoice(orderId: string, file: IUploadedFile): Promise<Invoice> {
    try {
      const existingInvoice = await this._invoiceRepository.findOne({
        orderId,
      });
      if (existingInvoice) {
        throw new ConflictException(
          `Invoice already exists for order ${orderId}`,
        );
      }

      const fileName = `${this._invoiceRepository.generateObjectId()}.pdf`;
      const objectKey = `${orderId}/invoices/${fileName}`;

      await this._uploadToS3(file, objectKey);

      const invoice = await this._invoiceRepository.create({
        _id: this._invoiceRepository.generateObjectId(),
        orderId,
        url: objectKey,
        sentAt: null,
      });

      this._logger.log('Invoice uploaded:', {
        invoiceId: invoice._id,
        orderId,
        fileName,
      });

      await this.tryMarkInvoiceAsSent(orderId, invoice);

      return invoice;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this._logger.error('Error uploading invoice:', {
        orderId,
        error: error.message,
        stack: error.stack,
      });

      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async generateInvoiceDownloadUrl(
    invoiceId: string,
    disposition: ContentDisposition,
  ): Promise<{ url: string; expiresAt: string }> {
    try {
      const invoice = await this._invoiceRepository.findById(invoiceId);
      if (!invoice) {
        throw new NotFoundException(`Invoice not found`);
      }

      const contentDisposition =
        disposition === ContentDispositionEnum.INLINE
          ? `inline; filename="${invoiceId}.pdf"`
          : `attachment; filename="${invoiceId}.pdf"`;

      const url = await this._s3Service.generatePresignedUrl({
        bucket: this._bucketName,
        key: invoice.url,
        expiresIn: this._defaultUrlTtlSec,
        contentType: 'application/pdf',
        contentDisposition,
      });

      const expiresAt = new Date(
        Date.now() + this._defaultUrlTtlSec * 1000,
      ).toISOString();

      this._logger.debug('Generated pre-signed URL for invoice:', {
        invoiceId,
        orderId: invoice.orderId,
        objectKey: invoice.url,
        ttl: this._defaultUrlTtlSec,
        disposition,
        expiresAt,
      });

      return { url, expiresAt };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this._logger.error('Error generating pre-signed URL:', {
        invoiceId,
        error: error.message,
        stack: error.stack,
      });

      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async getInvoices(query: getInvoicesType): Promise<Invoice[]> {
    return this._invoiceRepository.find(query);
  }

  async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice not found`);
    }
    return invoice;
  }

  async tryMarkInvoiceAsSent(
    orderId: string,
    invoice?: Invoice,
  ): Promise<void> {
    try {
      const projection =
        await this._orderProjectionService.getByOrderId(orderId);
      if (!projection || projection.status !== OrderStatusEnum.SHIPPED) {
        this._logger.debug('Order not shipped, skipping sentAt update', {
          orderId,
          status: projection?.status,
        });
        return;
      }

      const invoiceToCheck =
        invoice ?? (await this._invoiceRepository.findOne({ orderId }));
      if (!invoiceToCheck) {
        this._logger.debug(
          'No invoice found for order, skipping sentAt update',
          { orderId },
        );
        return;
      }

      if (invoiceToCheck.sentAt) {
        this._logger.debug('Invoice already marked as sent, skipping update', {
          orderId,
          invoiceId: invoiceToCheck._id,
          sentAt: invoiceToCheck.sentAt,
        });
        return;
      }

      await this._markInvoiceAsSent(orderId);

      this._logger.log('Successfully marked invoice as sent', {
        orderId,
        invoiceId: invoiceToCheck._id,
      });
    } catch (error) {
      this._logger.error('Failed to mark invoice as sent', {
        orderId,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  private async _markInvoiceAsSent(orderId: string): Promise<void> {
    const now = new Date();
    await this._invoiceRepository.findOneAndUpdate(
      { orderId },
      { sentAt: now },
    );
  }

  private async _uploadToS3(
    file: IUploadedFile,
    objectKey: string,
  ): Promise<void> {
    try {
      await this._s3Service.uploadFile({
        bucket: this._bucketName,
        key: objectKey,
        file: file.buffer,
        contentType: 'application/pdf',
        contentLength: file.buffer.length,
      });
    } catch (error) {
      this._logger.error('S3 upload error:', error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
