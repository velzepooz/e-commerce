import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsMongoId } from 'class-validator';

export class BaseMongoDto {
  @ApiProperty({
    description: 'ID of the entity',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  _id: string;

  @ApiProperty({
    description: 'Creation date of the entity',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDate()
  createdAt?: Date;

  @ApiProperty({
    description: 'Last update date of the entity',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDate()
  updatedAt?: Date;
}
