import { ObjectId, IdType } from '../types/common-types';
import mongoose from 'mongoose';

export const convertToObjectId = (id: IdType): ObjectId => {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
};
