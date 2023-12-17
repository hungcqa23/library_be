import { NextFunction, Request, Response } from 'express';
import FeeReceipt from '../models/schemas/feeReceipt';
import catchAsync from '../utils/catchAsync';
import handleFactory from './handleFactory';
import { HTTP_STATUS } from '../constants/httpStatus';
import { MESSAGES } from '../constants/messages';

const getAllFeeReceipt = handleFactory.getAll(FeeReceipt);
const getFeeReceipt = handleFactory.getOne(FeeReceipt);
const createFeeReceipt = handleFactory.createOne(FeeReceipt);
const updateFeeReceipt = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.status(HTTP_STATUS.BAD_REQUEST).json({
    message: MESSAGES.ROUTE_IS_NOT_DEFINED
  });
});

const deleteFeeReceipt = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.status(HTTP_STATUS.BAD_REQUEST).json({
    message: MESSAGES.ROUTE_IS_NOT_DEFINED
  });
});

export default {
  getAllFeeReceipt,
  getFeeReceipt,
  updateFeeReceipt,
  createFeeReceipt,
  deleteFeeReceipt
};
