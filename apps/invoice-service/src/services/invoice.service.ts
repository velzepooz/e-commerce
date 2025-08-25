import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceDto } from '../dto';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { S3Service } from '@app/s3';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../types/invoice-repository.types';
import {
  ContentDispositionEnum,
  IUploadedFile,
  type ContentDisposition,
} from '@app/shared';
import { getInvoicesType } from '../types/invoice-service.types';

@Injectable()
export class InvoiceService {
  private readonly _logger = new Logger(InvoiceService.name);
  private readonly _bucketName: string;
  private readonly _defaultUrlTtlSec: number;

  constructor(
    private readonly _s3Service: S3Service,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _configService: ConfigService,
  ) {
    this._bucketName =
      this._configService.get<string>('INVOICE_BUCKET_NAME') || 'invoice';
    this._defaultUrlTtlSec =
      this._configService.get<number>('S3_URL_TTL_SEC_DEFAULT') || 5 * 60;
  }
  s;

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

      this._logger.log('Invoice uploaded event:', {
        invoiceId: invoice._id,
        orderId,
        fileName,
      });

      this._checkAndEmitSentEvent(invoice);

      return invoice;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log error and mask sensitive information
      this._logger.error('Error uploading invoice:', {
        orderId,
        error: error.message,
        stack: error.stack,
      });

      throw new InternalServerErrorException('Failed to upload invoice');
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

      this._logger.log('Generated pre-signed URL for invoice:', {
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

      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async getInvoices(query: getInvoicesType): Promise<Invoice[]> {
    return this._invoiceRepository.find(query);
  }

  async getInvoiceById(_id: string): Promise<InvoiceDto> {
    const invoice = await this._invoiceRepository.findById(_id);
    if (!invoice) {
      throw new NotFoundException(`Invoice not found`);
    }
    return invoice;
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
      this._logger.error('MinIO upload error:', error);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  private _checkAndEmitSentEvent(invoice: Invoice): void {
    // TODO: Implement order status check logic
    // This would typically involve calling the order service to check if the order is shipped
    // For now, we'll just emit the event if sentAt is set

    if (invoice.sentAt) {
      this._logger.log('Invoice sent event:', {
        invoiceId: invoice._id,
        orderId: invoice.orderId,
        sentAt: invoice.sentAt,
      });
    }
  }
}
