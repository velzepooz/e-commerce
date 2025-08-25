import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseMongoDto } from '@app/shared';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class InvoiceDto extends BaseMongoDto {
  @ApiPropertyOptional({
    description: 'Order ID associated with the invoice',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'URL of the invoice',
    example: 'https://minio.example.com/invoices/507f1f77bcf86cd799439011.pdf',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: 'Date when the invoice was sent',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
    required: false,
  })
  sentAt?: Date | null;
}
