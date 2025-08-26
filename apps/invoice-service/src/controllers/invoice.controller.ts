import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { InvoiceService } from '../services/invoice.service';
import {
  UploadInvoiceDto,
  InvoiceIdParamDto,
  GetInvoicesQueryDto,
  InvoiceDto,
  GetInvoiceUrlQueryDto,
  InvoiceUrlResponseDto,
} from '../dto';
import { type IUploadedFile, pdfFileValidation } from '@app/shared';
import { FileFastifyInterceptor } from 'fastify-file-interceptor';
import { INVOICE_FILE_SIZE } from '../constants/invoice-file-size.constant';

@ApiTags('invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @UseInterceptors(
    FileFastifyInterceptor('file', {
      fileFilter: pdfFileValidation,
      limits: {
        fileSize: INVOICE_FILE_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload invoice PDF file',
    description: 'Upload a PDF invoice file for a specific order',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Order ID associated with the invoice',
          example: '507f1f77bcf86cd799439011',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF invoice file',
        },
      },
      required: ['orderId', 'file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice uploaded successfully',
    type: InvoiceDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or file',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async upload(
    @Body() uploadInvoiceDto: UploadInvoiceDto,
    @UploadedFile() file: IUploadedFile,
  ): Promise<InvoiceDto> {
    if (!file.size) {
      throw new BadRequestException('File is required');
    }
    return this.invoiceService.uploadInvoice(uploadInvoiceDto.orderId, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of invoices',
    description: 'Retrieve a paginated list of invoices with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices',
    type: [InvoiceDto],
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  getInvoices(@Query() query: GetInvoicesQueryDto): Promise<InvoiceDto[]> {
    return this.invoiceService.getInvoices(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Retrieve a specific invoice by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceDto,
  })
  @ApiNotFoundResponse({
    description: 'Invoice not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid invoice ID',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  getInvoiceById(@Param() params: InvoiceIdParamDto): Promise<InvoiceDto> {
    return this.invoiceService.getInvoiceById(params.id);
  }

  @Get(':id/url')
  @ApiOperation({
    summary: 'Generate pre-signed URL for invoice',
    description:
      'Generate a short-lived pre-signed URL to securely download an invoice PDF without exposing credentials. The URL will expire after the specified time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed URL generated successfully',
    type: InvoiceUrlResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Invoice not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error or invoice data inconsistency',
  })
  async getInvoiceUrl(
    @Param() params: InvoiceIdParamDto,
    @Query() query: GetInvoiceUrlQueryDto,
  ): Promise<InvoiceUrlResponseDto> {
    return this.invoiceService.generateInvoiceDownloadUrl(
      params.id,
      query.disposition,
    );
  }
}
