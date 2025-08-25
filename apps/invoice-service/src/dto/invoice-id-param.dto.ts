import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceIdParamDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsMongoId()
  @IsNotEmpty()
  id: string;
}
