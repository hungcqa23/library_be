import ReturnBookForm from '../models/schemas/returnBookForm';
import handleFactory from './handleFactory';
import BorrowBookForm from '../models/schemas/borrowBookForm';
import { NextFunction, Response } from 'express';
import { AuthRequest, IReader } from '../models/interfaces/model.interfaces';
import Reader from '../models/schemas/reader';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';

const setBorrowerId = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.body.borrower) {
    const reader: IReader | null = await Reader.findOne({ user: req.user.id });
    if (!reader) {
      return next(new AppError(`Please create a reader card!`, 404));
    }
    reader.isBorrowing = true;

    req.body.borrower = reader._id;
  }

  next();
});
const getAllBorrowBookForm = handleFactory.getAll(BorrowBookForm);
const getBorrowBookForm = handleFactory.getOne(BorrowBookForm);
const updateBorrowBookForm = handleFactory.updateOne(BorrowBookForm);
const createBorrowBookForm = handleFactory.createOne(BorrowBookForm);
const deleteBorrowBookForm = handleFactory.deleteOne(BorrowBookForm);

export default {
  getAllBorrowBookForm,
  getBorrowBookForm,
  createBorrowBookForm,
  deleteBorrowBookForm,
  updateBorrowBookForm,
  setBorrowerId
};
