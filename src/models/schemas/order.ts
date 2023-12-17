import mongoose, { Document, Schema, Types, model } from 'mongoose';
import { IOrder } from '../interfaces/model.interfaces';

const orderSchema = new Schema({
  books: {
    type: [
      {
        type: Types.ObjectId,
        ref: 'Book'
      }
    ],
    ref: 'Book',
    require: [true, 'Order must belong to books!']
  },
  user: {
    type: Types.ObjectId,
    ref: 'User',
    require: [true, 'Order must belong to a user!']
  },
  price: {
    type: Number,
    required: [true, 'Order must have a price.']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  }
});

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName avatar_url'
  }).populate({
    path: 'books',
    populate: {
      path: 'nameBook'
    }
  });
});
const Order = model<IOrder>('Order', orderSchema);

export default Order;
