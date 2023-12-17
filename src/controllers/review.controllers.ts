import { Response, NextFunction } from 'express';
import Review from '../models/schemas/review';
import factory from './handleFactory';
import { AuthRequest } from '../models/interfaces/model.interfaces';

const setBookUserIds = (req: AuthRequest, res: Response, next: NextFunction) => {
  //Allow nested route
  if (!req.body.book) req.body.book = req.params.bookId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

const getAllReview = factory.getAll(Review);
const createReview = factory.createOne(Review);
const getReview = factory.getOne(Review);
const deleteReview = factory.deleteOne(Review);
const updateReview = factory.updateOne(Review);

export default {
  getAllReview,
  createReview,
  deleteReview,
  getReview,
  updateReview,
  setBookUserIds
};
