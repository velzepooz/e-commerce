import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsPositive,
  IsMongoId,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatusEnum } from '../../../../libs/shared/src/enums/order-status.enum';
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
  @IsPositive()
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

  @ApiProperty({
    description:
      'Client-provided unique identifier for idempotent order creation',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0123456789ab',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID(4, { message: 'clientOrderId must be a valid UUID v4' })
  clientOrderId: string;
}

export class PaginatedOrdersDto {
  @ApiProperty({
    description: 'List of orders',
    type: [OrderDto],
  })
  data: OrderDto[];

  @ApiProperty({
    description: 'Total number of orders',
    type: Number,
  })
  total: number;
}
