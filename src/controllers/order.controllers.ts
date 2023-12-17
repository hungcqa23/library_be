import { Response, Request, NextFunction } from 'express';
import Book from '../models/schemas/book';
import catchAsync from '../utils/catchAsync';
import Stripe from 'stripe';
import AppError from '../utils/appError';
import Order from '../models/schemas/order';
import { AuthRequest } from '../models/interfaces/model.interfaces';
import { HTTP_STATUS } from '../constants/httpStatus';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15'
});

const getCheckOutSession = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1) Get the currently booked tour
  const bookIds = req.body.bookIds as string[]; //array of book IDs to be purchased
  const books = await Book.find({ _id: { $in: bookIds } });

  if (books.length === 0) {
    return next(new AppError(`Couldn't find any books to purchase!`));
  }

  const lineItems = books.map(book => {
    return {
      quantity: 1,
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${book.nameBook} Book`,
          description: book.description,
          images: ['https://i.pinimg.com/564x/13/c5/dc/13c5dcaa8d8944daadf9d78d949fa7e3.jpg']
        },
        unit_amount: Number(book.price) * 100
      }
    };
  });

  const booksQuery = bookIds.join(',');
  const totalPrice = books.reduce((acc, book) => acc + Number(book.price), 0);
  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/api/v1/orderings/checkout?bookIds=${booksQuery}&user=${
      req.user.id
    }&price=${totalPrice}`,
    cancel_url: `${req.protocol}://${req.get('host')}/checkout`,
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    line_items: lineItems,
    mode: 'payment'
  });

  //3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  });
});

const createOrderCheckout = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { user, price } = req.query;
  const bookIds = String(req.query.bookIds).split(',');
  if (!bookIds || !user || !price) return next(new AppError(`Order creation failed`, HTTP_STATUS.BAD_REQUEST));
  // Check if the user in the query parameters matches the authenticated user
  if (user !== req.user.id) {
    return next(new AppError('User identity mismatch. Order creation failed.', HTTP_STATUS.FORBIDDEN));
  }

  const order = await Order.create({
    books: bookIds,
    user,
    price: Number(price)
  });

  // const redirectURL = `http://${process.env.APP_URL}/api/v1/books/`;
  // res.redirect(302, 'http://localhost:3000/api/v1/books/');
  res.status(200).json({
    status: 'success',
    order
  });
});

export default { getCheckOutSession, createOrderCheckout };
