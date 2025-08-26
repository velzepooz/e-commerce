import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OrderServiceService } from '../services/order.service';
import {
  CreateOrderDto,
  GetOrdersListQueryDto,
  OrderDto,
  OrderIdParamDto,
  PaginatedOrdersDto,
} from '../dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import type { FastifyReply } from 'fastify';

@ApiTags('orders')
@Controller('orders')
export class OrderServiceController {
  constructor(private readonly orderServiceService: OrderServiceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new order (idempotent)',
    description:
      'Creates a new order with the provided details. Idempotent based on sellerId and clientOrderId.',
  })
  @ApiCreatedResponse({
    description: 'Order created successfully (first time)',
    type: OrderDto,
  })
  @ApiOkResponse({
    description: 'Order already exists (idempotent response)',
    type: OrderDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    example: {
      statusCode: 400,
      message: ['priceCents must be a positive number'],
      error: 'Bad Request',
    },
  })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<OrderDto> {
    const result = await this.orderServiceService.create(createOrderDto);
    res.code(result.created ? HttpStatus.CREATED : HttpStatus.OK);

    return result.order;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve a specific order by its ID',
  })
  @ApiOkResponse({
    description: 'Order retrieved successfully',
    type: OrderDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid order ID format',
    example: {
      statusCode: 400,
      message: ['id must be a mongodb id'],
      error: 'Bad Request',
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    example: {
      statusCode: 404,
      message: 'Order not found',
      error: 'Not Found',
    },
  })
  async getById(@Param() params: OrderIdParamDto): Promise<OrderDto> {
    return this.orderServiceService.getById(params.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the status of an existing order',
  })
  @ApiOkResponse({
    description: 'Order status updated successfully',
    type: OrderDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    example: {
      statusCode: 400,
      message: ['status must be a valid enum value'],
      error: 'Bad Request',
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    example: {
      statusCode: 404,
      message: 'Order not found',
      error: 'Not Found',
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid status transition',
    example: {
      statusCode: 422,
      message: 'Cannot transition from SHIPPED to CREATED',
      error: 'Unprocessable Entity',
    },
  })
  async updateStatus(
    @Param() params: OrderIdParamDto,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    return this.orderServiceService.updateStatus(
      params.id,
      updateOrderStatusDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of orders',
    description:
      'Retrieve a list of orders with optional filtering and pagination',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    type: PaginatedOrdersDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    example: {
      statusCode: 400,
      message: ['limit must not be greater than 100'],
      error: 'Bad Request',
    },
  })
  async getOrdersList(
    @Query() query: GetOrdersListQueryDto,
  ): Promise<PaginatedOrdersDto> {
    return this.orderServiceService.getOrdersList(query);
  }
}
