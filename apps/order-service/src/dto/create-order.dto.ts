import { OmitType } from '@nestjs/swagger';
import { OrderDto } from './order.dto';

export class CreateOrderDto extends OmitType(OrderDto, [
  '_id',
  'createdAt',
  'updatedAt',
  'status',
]) {}
