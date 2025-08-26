import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus } from '../../../../libs/shared/src/enums/order-status.enum';
import { OrderStatusEnum } from '../../../../libs/shared/src/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    example: OrderStatusEnum.ACCEPTED,
    enum: Object.values(OrderStatusEnum),
  })
  @IsNotEmpty()
  @IsEnum(OrderStatusEnum)
  status: OrderStatus;
}
