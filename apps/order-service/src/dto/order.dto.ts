import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsPositive,
  Min,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { BaseMongoDto } from '@app/shared';

export class OrderDto extends BaseMongoDto {
  @ApiProperty({
    description: 'Price in cents',
    example: 1999,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceCents: number;

  @ApiProperty({
    description: 'Quantity of items ordered',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    description: 'Current order status',
    example: 'CREATED',
    enum: OrderStatusEnum,
  })
  @IsNotEmpty()
  @IsEnum(OrderStatusEnum)
  status: keyof typeof OrderStatusEnum;

  @ApiProperty({
    description: 'Product identifier',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Customer identifier',
    example: '507f1f77bcf86cd799439013',
  })
  @IsMongoId()
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Seller identifier',
    example: '507f1f77bcf86cd799439014',
  })
  @IsMongoId()
  @IsNotEmpty()
  @IsString()
  sellerId: string;
}
