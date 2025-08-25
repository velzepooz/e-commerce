import { MultipartFile } from '@fastify/multipart';

export type UploadedFile = {
  file: MultipartFile[];
};

export type getInvoicesType = {
  orderId: string;
};
