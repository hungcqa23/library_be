import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { validate } from 'uuid';
import validator from 'validator';
import { calculateAge } from '../../utils/dateUtils';
import { IReader } from '../interfaces/model.interfaces';

// enum ReaderType {
//   Member = 'member',
//   Manager = 'manager'
// }

// Create Reader Schema
const ReaderSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    default: 'Anonymous'
  },
  readerType: {
    type: String,
    required: true,
    default: 'want to learn something new'
  },
  address: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function (value: Date) {
        const age = calculateAge(value);
        return age >= 18 && age <= 55;
      },
      message: 'Reader age must be between 18 and 55'
    }
  },
  cardCreatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiredDate: {
    type: Date,
    default: () => {
      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() + 6);
      return currentDate;
    },
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  user: {
    type: Types.ObjectId,
    ref: 'User'
  },
  isBorrowing: {
    type: Boolean,
    default: false,
    required: true
  }
});

ReaderSchema.pre('findOneAndUpdate', function (next) {
  this.find({ isBorrowing: false });
  next();
});

const Reader = model<IReader>('Reader', ReaderSchema);

export default Reader;
