import { Schema, model, Document, Types } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Review from './review';
import { IUser } from '../interfaces/model.interfaces';
import { MESSAGES } from '../../constants/messages';

const UserSchema = new Schema({
  firstName: {
    type: String,
    required: [true, MESSAGES.FIRST_NAME_IS_REQUIRED]
  },
  lastName: {
    type: String,
    required: [true, MESSAGES.LAST_NAME_IS_REQUIRED]
  },
  email: {
    type: String,
    required: [true, MESSAGES.EMAIL_IS_REQUIRED],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, MESSAGES.EMAIL_IS_NOT_VALID]
  },
  avatar: {
    type: Buffer,
    select: false
  },
  avatar_url: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, MESSAGES.PASSWORD_IS_REQUIRED],
    minlength: 9,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, MESSAGES.PASSWORD_CONFIRM_IS_REQUIRED],
    validate: {
      validator: function (this: IUser, value: string) {
        return value === this.password;
      },
      message: MESSAGES.PASSWORD_CONFIRM_DO_NOT_MATCH
    },
    select: false
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

UserSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
): Promise<Boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

UserSchema.methods.changedPasswordAfter = function (JWTTimestamp: number) {
  if (this.passwordChangedAt) {
    const changedTimestamp: number = this.passwordChangedAt.getTime() / 1000;
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

UserSchema.methods.createPasswordResetToken = function (): string {
  // 1) Generate a random token using uuid
  const resetToken = uuidv4();

  // 2) Hash the token and store it in the user document
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // 3) Set an expiration time for the token (10 mins)
  this.passwordResetExpires = Date.now() + 10 * 1000 * 60;

  return resetToken;
};

UserSchema.methods.generateAvatarUrl = function () {
  const avatarUrl = `${process.env.APP_URL}/api/v1/users/${this._id}/avatar`;
  this.avatar_url = avatarUrl;
};

UserSchema.statics.generateAvatarUrl = async function (userId: Types.ObjectId) {
  const avatarUrl = `${process.env.APP_URL}/api/v1/users/${userId}/avatar`;
  await this.updateOne({ _id: userId }, { avatar_url: avatarUrl });
};

UserSchema.pre('save', async function (next): Promise<void> {
  if (!this.isModified('password')) return next();

  // Generate salt
  const salt = await bcrypt.genSalt(10);

  // Hash the password with generated salt
  if (this.password) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Clean the confirmed password field
  this.passwordConfirm = '';

  next();
});

UserSchema.pre<IUser>('save', function (next): void {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000);
  // -1s because this token may issued before password changed at

  next();
});

UserSchema.pre<IUser>('save', function (next): void {
  if (this.avatar) {
    const avatarUrl = `${process.env.APP_URL}/api/v1/users/${this._id}/avatar`;
    this.avatar_url = avatarUrl;
  }
  next();
});

UserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as { avatar?: Buffer };
  if (update && update.avatar) {
    const user = await this.model.findOne(this.getQuery());
    console.log(user);
    user?.generateAvatarUrl();
    await user?.save();
  }
  next();
});

UserSchema.pre(/^find/, function (next): void {
  const isAuthQuery = this.getQuery().email;
  if (!isAuthQuery) {
    this.find({ active: { $ne: false } });
  }
  next();
});

UserSchema.pre('findOneAndDelete', async function (next) {
  const userId = this.getFilter()._id;
  await Review.deleteMany({ user: userId });
  next();
});

const User = model<IUser>('User', UserSchema);

export default User;
