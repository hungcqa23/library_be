import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';
import UserTransaction from '../models/schemas/userTransaction';
import { AuthRequest, IUserFinancials, IUserTransaction } from '../models/interfaces/model.interfaces';
import UserFinancials from '../models/schemas/userFinancials';
import { HTTP_STATUS } from '../constants/httpStatus';

const updateStatusTransaction = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.query.status || !req.query.user) {
    return next(new AppError(`Transaction not found`, HTTP_STATUS.NOT_FOUND));
  }

  const { status, user } = req.query;
  if (req.user.id != user) {
    return next(new AppError(`Transaction doesn't belong to this user`, HTTP_STATUS.BAD_REQUEST));
  }
  const userFinancials: IUserFinancials | null = await UserFinancials.findOne({ user });
  if (!userFinancials) {
    return next(new AppError(`Please create a User Financials!`));
  }

  const updatedTransaction: IUserTransaction | null = await UserTransaction.findOne({
    userFinancials: userFinancials._id
  }).sort({ createdAt: -1 });

  if (!updatedTransaction) {
    return next(new AppError(`Not found user transaction!`));
  }

  updatedTransaction.status = 'success';
  updatedTransaction.save();

  res.status(200).json({
    status,
    date: updatedTransaction
  });
});

export default { updateStatusTransaction };
