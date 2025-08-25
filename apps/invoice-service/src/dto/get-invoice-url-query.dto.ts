import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { type ContentDisposition, ContentDispositionEnum } from '@app/shared';

export class GetInvoiceUrlQueryDto {
  @ApiPropertyOptional({
    description: 'Content disposition for the download',
    enum: Object.values(ContentDispositionEnum),
    default: ContentDispositionEnum.INLINE,
    example: ContentDispositionEnum.INLINE,
  })
  @IsOptional()
  @IsEnum(ContentDispositionEnum)
  disposition: ContentDisposition = ContentDispositionEnum.INLINE;
}
