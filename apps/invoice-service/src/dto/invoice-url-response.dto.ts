import { ApiProperty } from '@nestjs/swagger';

export class InvoiceUrlResponseDto {
  @ApiProperty({
    description: 'Pre-signed URL for downloading the invoice PDF',
    example:
      'https://minio.local/invoices/orders/123/abc.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...',
  })
  url: string;

  @ApiProperty({
    description: 'Expiration timestamp of the pre-signed URL',
    example: '2025-08-24T10:00:00Z',
  })
  expiresAt: string;
}
