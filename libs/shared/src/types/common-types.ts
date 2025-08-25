import { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export type IdType = string | ObjectId;

export type IUploadedFile = {
  filename: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};
