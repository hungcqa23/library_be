import mongoose, { Schema, Document, Types, model, CallbackError } from 'mongoose';
import BorrowBookForm from './borrowBookForm';
import Book from './book';
import { IBook, IBorrowBookForm, IReader, IReturnBookForm, IUserFinancials } from '../interfaces/model.interfaces';
import UserFinancials from './userFinancials';
import Reader from './reader';
import AppError from '../../utils/appError';

const ReturnBookFormSchema = new Schema({
  borrower: {
    type: Types.ObjectId,
    ref: 'Reader'
  },
  lostBooks: {
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
    ]
  },
  returnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  borrowBookForm: {
    type: Types.ObjectId,
    ref: 'BorrowBookForm',
    unique: true
  },
  fee: {
    type: Number,
    default: 0
  }
});

ReturnBookFormSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'borrower',
    select: 'fullName'
  })
    .populate({
      path: 'borrowBookForm',
      select: 'borrowDate'
    })
    .populate({
      path: 'lostBooks.bookId',
      select: 'nameBook'
    });
  next();
});

ReturnBookFormSchema.pre('save', async function (next) {
  try {
    const borrowBookForm: IBorrowBookForm | null = await BorrowBookForm.findById(this.borrowBookForm);

    if (!borrowBookForm) {
      throw new Error('Related BorrowBookForm not found!');
    }

    borrowBookForm.isReturned = true;
    await borrowBookForm.save();

    //Calculate late fee
    const expectedDate = borrowBookForm.expectedReturnDate;
    const returnDate = this.returnDate;
    const feeDays = Math.round((returnDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    let fee = feeDays > 0 ? feeDays * 1 : 0;

    //Calculate lost book fee
    if (this.lostBooks && this.lostBooks.length > 0) {
      const lostBookIds = this.lostBooks.map(book => {
        if (book.bookId) return book.bookId;
      });
      const lostBooks: IBook[] = await Book.find({ _id: { $in: lostBookIds } });
      const lostBookPrices = lostBooks.map((book, index) => Number(book.price) * this.lostBooks[index].quantity || 0);
      const lostBookFee = lostBookPrices.reduce((acc, price) => acc + price, 0);
      fee += lostBookFee;
    }

    // Update the book count for the lost books
    const updatePromises = borrowBookForm.books.map(async borrowedBook => {
      // Find the lost books in the borrowed books
      const lostBook = this.lostBooks.find(lostBook => lostBook.bookId?.toString() === borrowedBook.bookId.toString());

      if (lostBook) {
        const book = await Book.findById(borrowedBook.bookId);
        if (book) {
          book.numberOfBooks += borrowedBook.quantity - lostBook.quantity;
          await book.save();
        }
      } else {
        const book = await Book.findById(borrowedBook.bookId);
        if (book) {
          book.numberOfBooks += borrowedBook.quantity;
          await book.save();
        }
      }
    });

    await Promise.all(updatePromises);

    this.fee = fee;

    // Update userFinancials
    const reader: IReader | null = await Reader.findById(this.borrower);
    if (!reader) {
      return next(new AppError(`Please create a new reader`, 400));
    }

    let userFinancials: IUserFinancials | null = await UserFinancials.findOne({
      user: reader.user
    });

    if (!userFinancials) {
      userFinancials = await UserFinancials.create({ user: reader.user });
    }

    userFinancials.totalDebt += fee;
    await userFinancials.save();

    next();
  } catch (err: any) {
    next(err);
  }
});

// ReturnBookFormSchema.pre('save', async function (next) {
//   try {
//     if (this.lostBooks && this.lostBooks.length > 0) {
//       const lostBooks = await Promise.all(this.lostBooks.map(lostBook => Book.findById(lostBook)));

//       lostBooks.forEach(lostBook => {
//         if (lostBook && lostBook.price) {
//           this.fee += Number(lostBook.price);
//         }
//       });
//     }
//     next();
//   } catch (err: any) {
//     next(err);
//   }
// });

// ReturnBookFormSchema.pre('save', async function (next) {
//   try {
//     const borrowBookForm = await BorrowBookForm.findById(this.borrowBookForm);
//     if (!borrowBookForm) {
//       throw new Error('Related BorrowBookForm not found!');
//     }
//     const lostBookIds = this.lostBooks.map(book => book.toString());
//     const borrowedBookIds = borrowBookForm.books.map(book => book.toString());

//     const returnBooks = borrowedBookIds.filter(bookId => lostBookIds.includes(bookId));
//     const bookIdsToUpdate = returnBooks.map(book => new Types.ObjectId(book));
//     Book.updateMany(
//       {
//         _id: {
//           $in: bookIdsToUpdate
//         }
//       },
//       {
//         $inc: {
//           numberOfBooks: 1
//         }
//       }
//     );
//   } catch (err: any) {
//     next(err);
//   }
// });

const ReturnBookForm = model<IReturnBookForm>('ReturnBookForm', ReturnBookFormSchema);

export default ReturnBookForm;
