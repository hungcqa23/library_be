import { Schema, Types, model } from 'mongoose';
import Book from './book';
import { IBorrowBookForm } from '../interfaces/model.interfaces';
import { MESSAGES } from '../../constants/messages';

const BorrowBookFormSchema = new Schema({
  books: {
    type: [
      {
        bookId: {
          type: Types.ObjectId,
          ref: 'Book'
        },
        quantity: {
          type: Number,
          default: 1
        }
      }
    ],
    required: true
  },
  borrower: {
    type: Types.ObjectId,
    required: true,
    ref: 'Reader'
  },
  borrowDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedReturnDate: {
    type: Date,
    required: true,
    default: function () {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek;
    }
  },
  isReturned: {
    type: Boolean,
    default: false,
    required: true
  }
});

BorrowBookFormSchema.pre('findOneAndDelete', function (next) {
  this.find({ isReturned: false });
  next();
});

BorrowBookFormSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'borrower',
    select: 'fullName'
  });
  next();
});

BorrowBookFormSchema.pre('findOne', function (next) {
  this.populate({
    path: 'books.bookId',
    select: 'nameBook'
  });
  next();
});

BorrowBookFormSchema.pre('save', async function (next) {
  try {
    const bookPromises = this.books.map(book => Book.findById(book.bookId));
    const books = await Promise.all(bookPromises);
    const validBooks = books.filter((book, index) => book && book.numberOfBooks >= this.books[index].quantity);
    if (this.isNew) {
      if (books.length !== validBooks.length || validBooks.length === 0) {
        throw new Error(MESSAGES.BOOKS_ARE_NOT_AVAILABLE);
      }
    }

    validBooks.forEach((book, index) => {
      if (book) {
        book.numberOfBooks -= this.books[index].quantity;
        book.save();
      }
    });

    next();
  } catch (err: any) {
    next(err);
  }
});

const BorrowBookForm = model<IBorrowBookForm>('BorrowBookForm', BorrowBookFormSchema);

export default BorrowBookForm;
