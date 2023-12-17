import { NextFunction, Request, Response } from 'express';
import Reader from '../models/schemas/reader';
import catchAsync from '../utils/catchAsync';
import handleFactory from './handleFactory';
import AppError from '../utils/appError';
import { IUser } from '../models/interfaces/model.interfaces';
import User from '../models/schemas/user';

const getAllReader = handleFactory.getAll(Reader);
const getReader = handleFactory.getOne(Reader);
const updateReader = handleFactory.updateOne(Reader);

const createReader = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.body.user) {
    return next(new AppError(`Request must have UserId`, 400));
  }

  const user: IUser | null = await User.findById(req.body.user);

  if (!user) {
    return next(new AppError('User not found!. Please attach correct UserId', 404));
  }
  req.body.email = user.email;

  const reader = await Reader.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      reader
    }
  });
});
const deleteReader = handleFactory.deleteOne(Reader);

export default {
  getAllReader,
  getReader,
  updateReader,
  createReader,
  deleteReader
};
