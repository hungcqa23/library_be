import Book from '../models/schemas/book';
import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';
import factory from './handleFactory';
import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { IBook, MulterFile } from '../models/interfaces/model.interfaces';

const multerStorage: StorageEngine = multer.memoryStorage();

const multerFilter = (req: Request, file: MulterFile, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(null, false);
    cb(new AppError('Not an image! Please upload only images.', 400));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

const uploadBookImages = upload.fields([
  {
    name: 'photos',
    maxCount: 3
  }
]);

const addImages = (req: Request, res: Response, next: NextFunction) => {
  if (req.files && 'photos' in req.files) {
    req.body.photos = [];
    req.files['photos'].forEach(file => {
      req.body.photos.push(file.buffer);
    });
  }
  // Check if number of photos exceeds limit
  if (req.body.photos && req.body.photos.length >= 4) {
    return res.status(400).json({ message: 'Maximum number of photos exceeded' });
  }
  next();
};

const getBookImage = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const book: IBook | null = await Book.findById(req.params['id']).select('+photos');
  if (!book) {
    return res.status(404).json({ message: 'No book was found!' });
  }
  const image: Buffer | undefined = book.photos[Number(req.params.index)];
  // Set content-type header to image/jpeg
  res.setHeader('Content-Type', 'image/jpeg');
  // Send sharpened image to client
  return res.send(image);
});

const getAllBook = factory.getAll(Book);
const getBook = factory.getOne(Book, { path: 'reviews' });
const createBook = factory.createOne(Book);
const deleteBook = factory.deleteOne(Book);
const updateBook = factory.updateOne(Book);

export default {
  getAllBook,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  uploadBookImages,
  getBookImage,
  addImages
};
