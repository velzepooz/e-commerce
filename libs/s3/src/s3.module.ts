import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3Service,
      useFactory: (configService: ConfigService) => {
        return new S3Service({
          endpoint: configService.get<string>('S3_ENDPOINT') || '',
          region: configService.get<string>('S3_REGION') || '',
          accessKeyId: configService.get<string>('S3_ACCESS_KEY_ID') || '',
          secretAccessKey:
            configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3Service],
})
export class S3Module {}
