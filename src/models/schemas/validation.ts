import { Schema, model } from 'mongoose';
import { IValidation } from '../interfaces/model.interfaces';
const ValidationSchema = new Schema({
  ageMin: {
    type: Number,
    required: true,
    default: 18
  },
  ageMax: {
    type: Number,
    required: true,
    default: 55
  },
  expiredMonth: {
    type: Number,
    required: true,
    default: 6
  },
  publicationYear: {
    type: Number,
    required: true,
    default: 8
  },
  borrowingDate: {
    type: Number,
    required: true,
    default: 7
  },
  numberOfBooks: {
    type: Number,
    required: true,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now,
    require: true
  }
});

const Validation = model<IValidation>('Validation', ValidationSchema);

export default Validation;
