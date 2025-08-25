import {
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsMongoId,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatusEnum } from '../enums/order-status.enum';

export class GetListOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by seller ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    example: 'CREATED',
    enum: OrderStatusEnum,
  })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: keyof typeof OrderStatusEnum;

  @ApiPropertyOptional({
    description: 'Maximum number of orders to return',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of orders to skip for pagination',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  skip?: number = 0;
}
