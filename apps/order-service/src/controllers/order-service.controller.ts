import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OrderServiceService } from '../services/order-service.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { OrderIdParamDto } from '../dto/order-id-param.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderDto } from '../dto/order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrderServiceController {
  constructor(private readonly orderServiceService: OrderServiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order with the provided details',
  })
  @ApiCreatedResponse({
    description: 'Order created successfully',
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
  async create(@Body() createOrderDto: CreateOrderDto): Promise<OrderDto> {
    return this.orderServiceService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List orders',
    description:
      'Retrieve a list of orders with optional filtering and pagination',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filter by seller ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
    example: 'CREATED',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of orders to return',
    example: 20,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of orders to skip',
    example: 0,
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    example: {
      orders: [
        {
          id: '507f1f77bcf86cd799439011',
          priceCents: 1999,
          quantity: 2,
          productId: '507f1f77bcf86cd799439012',
          customerId: '507f1f77bcf86cd799439013',
          sellerId: '507f1f77bcf86cd799439014',
          status: 'CREATED',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
        },
      ],
      total: 1,
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    example: {
      statusCode: 400,
      message: ['limit must not be greater than 100'],
      error: 'Bad Request',
    },
  })
  async list(
    @Query() query: ListOrdersQueryDto,
  ): Promise<{ orders: OrderDto[]; total: number }> {
    return this.orderServiceService.list(query);
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
  @ApiParam({
    name: 'id',
    description: 'Order identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateOrderStatusDto,
    description: 'Order status update data',
    examples: {
      example1: {
        summary: 'Accept order',
        value: {
          status: 'ACCEPTED',
        },
      },
      example2: {
        summary: 'Reject order',
        value: {
          status: 'REJECTED',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Order status updated successfully',
    type: OrderDto,
    example: {
      id: '507f1f77bcf86cd799439011',
      priceCents: 1999,
      quantity: 2,
      productId: '507f1f77bcf86cd799439012',
      customerId: '507f1f77bcf86cd799439013',
      sellerId: '507f1f77bcf86cd799439014',
      status: 'ACCEPTED',
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T11:00:00.000Z',
    },
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
}
