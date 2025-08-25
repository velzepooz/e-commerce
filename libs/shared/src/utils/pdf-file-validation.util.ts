import { IUploadedFile } from '../types/common-types';
import { BadRequestException } from '@nestjs/common';

export const pdfFileValidation = (
  _: unknown,
  file: IUploadedFile,
  callback,
) => {
  const fileExtension = file.originalname.split('.').pop();

  if (fileExtension !== 'pdf' || file.mimetype !== 'application/pdf') {
    callback(new BadRequestException('Invalid file type'), false);
  }

  callback(null, true);
};
