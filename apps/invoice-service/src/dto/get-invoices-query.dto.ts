import { IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetInvoicesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter invoices by order ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  orderId: string;
}
