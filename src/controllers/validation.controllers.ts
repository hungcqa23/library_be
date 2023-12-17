import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { IValidation } from '../models/interfaces/model.interfaces';
import Validation from '../models/schemas/validation';
import { setValidation } from '../utils/setValidation';

const createDefaultValidation = async (res?: Response) => {
  const ageMin = 18,
    ageMax = 55,
    expiredMonth = 6,
    publicationYear = 8,
    borrowingDate = 7,
    numberOfBooks = 100;

  const validation: IValidation = await Validation.create({
    ageMin,
    ageMax,
    expiredMonth,
    publicationYear,
    borrowingDate,
    numberOfBooks
  });

  res?.status(200).json({
    ageMin,
    ageMax,
    expiredMonth,
    publicationYear,
    borrowingDate,
    numberOfBooks
  });

  return validation;
};

export const getCurrentValidation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const validation: IValidation | null = await Validation.findOne().sort({
    createdAt: -1
  });

  if (!validation) {
    return createDefaultValidation(res);
  }

  res.status(200).json({
    status: 'success',
    validation
  });
});

export const setLibraryValidation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const validation: IValidation | null = await Validation.findOne().sort({ createdAt: -1 });
  if (!validation) {
    await Validation.create({
      ageMax: 55
    });
    return setNewValidation(res, req);
  }

  return setNewValidation(res, req);
});

const setPropertyValidations = (validation: IValidation, req: Request) => {
  validation.ageMin = req.body.ageMin || validation.ageMin;
  validation.ageMax = req.body.ageMax || validation.ageMax;
  validation.borrowingDate = req.body.borrowingDate || validation.borrowingDate;
  validation.publicationYear = req.body.publicationYear || validation.publicationYear;
  validation.numberOfBooks = req.body.numberOfBooks || validation.numberOfBooks;
  validation.expiredMonth = req.body.expiredMonth || validation.expiredMonth;

  setValidation(
    validation.ageMin,
    validation.ageMax,
    validation.expiredMonth,
    validation.numberOfBooks,
    validation.publicationYear,
    validation.borrowingDate
  );

  return validation;
};

const setNewValidation = async (res: Response, req: Request) => {
  const validation: IValidation | null = await Validation.findOne().sort({ createdAt: -1 });
  if (!validation) {
    return res.status(400).json({
      status: 'server error'
    });
  }
  const newValidation: IValidation = setPropertyValidations(validation, req);

  await newValidation.save();
  res.status(200).json({
    status: 'successfully updated!',
    data: newValidation
  });
};
