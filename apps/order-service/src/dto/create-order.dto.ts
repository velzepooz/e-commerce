import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { OrderDto } from './order.dto';

export class CreateOrderDto extends OmitType(OrderDto, [
  '_id',
  'createdAt',
  'updatedAt',
  'status',
]) {
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
