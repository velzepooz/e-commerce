import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderIdParamDto {
  @ApiProperty({
    description: 'Order identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
