import { NextFunction, Response } from 'express';
import ReturnBookForm from '../models/schemas/returnBookForm';
import handleFactory from './handleFactory';
import { AuthRequest, IBorrowBookForm } from '../models/interfaces/model.interfaces';
import BorrowBookForm from '../models/schemas/borrowBookForm';
import catchAsync from '../utils/catchAsync';

const setBorrowerBookReturnFormId = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Allow nested route
  if (!req.body.borrowBookForm) req.body.borrowBookForm = req.params.borrowBookFormId;
  if (!req.body.borrower) {
    const borrowBookForm: IBorrowBookForm | null = await BorrowBookForm.findById(req.body.borrowBookForm);
    if (borrowBookForm) {
      req.body.borrower = borrowBookForm.borrower;
    }
  }

  next();
});

const getAllReturnBookForm = handleFactory.getAll(ReturnBookForm);
const getReturnBookForm = handleFactory.getOne(ReturnBookForm);
const updateReturnBookForm = handleFactory.updateOne(ReturnBookForm);
const createReturnBookForm = handleFactory.createOne(ReturnBookForm);
const deleteReturnBookForm = handleFactory.deleteOne(ReturnBookForm);

export default {
  getAllReturnBookForm,
  createReturnBookForm,
  deleteReturnBookForm,
  getReturnBookForm,
  updateReturnBookForm,
  setBorrowerBookReturnFormId
};
