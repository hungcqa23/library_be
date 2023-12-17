import { Schema, model, Types } from 'mongoose';
import UserFinancials from './userFinancials';
import AppError from '../../utils/appError';
import { IFeeReceipt } from '../interfaces/model.interfaces';
import { IUserFinancials } from '../interfaces/model.interfaces';
import { HTTP_STATUS } from '../../constants/httpStatus';

const FeeReceiptSchema = new Schema(
  {
    userFinancials: {
      type: Types.ObjectId,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    totalDebt: {
      type: Number,
      required: true
    },
    amountPaid: {
      type: Number,
      required: true
    }
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
  }
);

FeeReceiptSchema.virtual('remainingBalance').get(function (this: IFeeReceipt) {
  return this.totalDebt - this.amountPaid;
});

FeeReceiptSchema.pre<IFeeReceipt>('save', async function (next) {
  if (this.amountPaid > this.totalDebt) {
    const error = new AppError('Amount paid cannot be greater than total debt', HTTP_STATUS.BAD_REQUEST);
    return next(error);
  }

  if (this.amountPaid > this.balance) {
    const error = new AppError('Amount paid cannot be greater than total balance', HTTP_STATUS.BAD_REQUEST);
    return next(error);
  }

  const userFinancials: IUserFinancials | null = await UserFinancials.findById(this.userFinancials);
  if (!userFinancials) {
    return next(new AppError(`Can't find the userFinancial`, 404));
  }

  userFinancials.balance -= this.amountPaid;
  userFinancials.totalDebt -= this.amountPaid;
  userFinancials.save();
  return next();
});

const FeeReceipt = model<IFeeReceipt>('LateFeeReceipt', FeeReceiptSchema);
export default FeeReceipt;
