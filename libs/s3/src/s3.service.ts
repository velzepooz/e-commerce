import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type S3UploadFileParams = {
  bucket: string;
  key: string;
  file: Buffer;
  contentType?: string;
  contentLength?: number;
};

export type S3PresignedUrlParams = {
  bucket: string;
  key: string;
  expiresIn?: number;
  contentType?: string;
  contentDisposition?: string;
};

@Injectable()
export class S3Service {
  private readonly _logger = new Logger(S3Service.name);
  private readonly _s3Client: S3Client;

  constructor(config: S3Config) {
    if (
      !config.endpoint ||
      !config.region ||
      !config.accessKeyId ||
      !config.secretAccessKey
    ) {
      this._logger.error('Invalid S3 configuration', config);
      throw new InternalServerErrorException('Something went wrong');
    }
    this._s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(params: S3UploadFileParams): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.file,
        ...(params.contentType && { ContentType: params.contentType }),
        ...(params.contentLength && { ContentLength: params.contentLength }),
      });

      await this._s3Client.send(command);
    } catch (error) {
      this._logger.error('Failed to upload file to S3', error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async generatePresignedUrl(params: S3PresignedUrlParams): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        ...(params.contentType && { ResponseContentType: params.contentType }),
        ...(params.contentDisposition && {
          ResponseContentDisposition: params.contentDisposition,
        }),
      });

      const signedUrl = await getSignedUrl(this._s3Client, command, {
        expiresIn: params.expiresIn || 5 * 60,
      });

      return signedUrl;
    } catch (error) {
      this._logger.error('Failed to generate presigned URL', error);
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
