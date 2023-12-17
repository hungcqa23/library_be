import { IValidation } from '../models/interfaces/model.interfaces';
import Book from '../models/schemas/book';
import BorrowBookForm from '../models/schemas/borrowBookForm';
import Reader from '../models/schemas/reader';
import Validation from '../models/schemas/validation';
import { calculateAge } from './dateUtils';

export const setValidation = (
  ageMin: number,
  ageMax: number,
  expiredMonth: number,
  numberOfBooks: number,
  publicationYear: number,
  borrowingDate: number
) => {
  // Set date of birth and expired date
  const ReaderSchema = Reader.schema;
  ReaderSchema.path('dateOfBirth').validators = [
    {
      validator: function (value: Date) {
        const age = calculateAge(value);
        return age >= ageMin && age <= ageMax;
      },
      message: `Reader age must be between ${ageMin} and ${ageMax}`
    }
  ];

  ReaderSchema.path('expiredDate').default(() => {
    const now = new Date();
    return now.setMonth(new Date().getMonth() + expiredMonth);
  });

  // Set number of books and pulication year
  const BookSchema = Book.schema;
  BookSchema.path('numberOfBooks').validators = [
    {
      validator: function (numOfBooks: number) {
        return numOfBooks < numberOfBooks && numOfBooks >= 0;
      },
      message: `Number of books must be less than or equal ${numberOfBooks}`
    }
  ];

  BookSchema.path('publicationYear').validators = [
    {
      validator: function (publicationYear: number) {
        return (
          new Date().getFullYear() - publicationYear <= publicationYear && publicationYear <= new Date().getFullYear()
        );
      },
      message: `Only accept books published within the last ${publicationYear || 8} years.`
    }
  ];

  // Set borrowing date
  const BorrowBookFormSchema = BorrowBookForm.schema;
  BorrowBookFormSchema.path('expectedReturnDate').default(() => {
    return new Date(new Date().getTime() + borrowingDate * 24 * 60 * 60 * 1000);
  });
};

export const setCurrentValidation = async () => {
  const currentValidation: IValidation | null = await Validation.findOne().sort({ createdAt: -1 });
  if (!currentValidation) return;

  const { ageMin, ageMax, borrowingDate, numberOfBooks, publicationYear } = currentValidation;
  return setValidation(ageMin, ageMax, borrowingDate, numberOfBooks, publicationYear, borrowingDate);
};
