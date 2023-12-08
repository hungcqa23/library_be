import catchAsync from '../utils/catchAsync';
import { Request, Response, NextFunction } from 'express';
import User from '../models/schemas/user';
import jwt from 'jsonwebtoken';
import AppError from '../utils/appError';
import Email from '../utils/email';
import crypto from 'crypto';
import { AuthRequest, IUser } from '../models/interfaces/model.interfaces';
import { getGoogleUserInfo, getOAuthGoogleToken } from '../utils/googleOAuth';
import { HTTP_STATUS } from '../constants/httpStatus';
import { MESSAGES } from '../constants/messages';
import { GoogleUserResult } from '../models/interfaces/OAuth.interfaces';
import { signToken } from '../utils/jwt';
import { LoginReqBody } from '../types/User.requests';
import { ParamsDictionary } from 'express-serve-static-core';

interface TokenPayload {
  id: string;
  iat: number;
  exp: number;
}

interface CookieOptions {
  expires: Date;
  httpOnly?: boolean;
  secure?: boolean;
}

const createSendToken = (user: IUser, statusCode: number, res: Response): void => {
  // Create a new access token
  const accessToken = signToken(
    user._id,
    process.env.JWT_ACCESS_SECRET as string,
    process.env.JWT_ACCESS_EXPIRES_IN as string
  );
  const expiresIn = Number(process.env.JWT_COOKIE_EXPIRES_IN) || 1;

  const cookieOptions: CookieOptions = {
    expires: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
    // httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  const refreshToken = signToken(
    user._id,
    process.env.JWT_REFRESH_SECRET as string,
    process.env.JWT_REFRESH_EXPIRES_IN as string
  );

  res.cookie('jwt', refreshToken, cookieOptions);

  // Remove the password:
  user.password = '';
  user.passwordConfirm = undefined;

  // Send the JWT token as part of the response body
  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: {
      user
    }
  });
};

const signUp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, passwordConfirm, role } = req.body;
  if (!email || !password) {
    return next(new AppError(`Please provide email or password`, HTTP_STATUS.BAD_REQUEST));
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    role
  });

  // Don't block email => don't use await
  // const url = `${req.protocol}://${req.get('host')}/api/v1/users/me`;
  // new Email(user, url).sendWelcome();

  createSendToken(user, 201, res);
});

const logIn = catchAsync(
  async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError(`Please provide email or password`, HTTP_STATUS.BAD_REQUEST));
    }

    const user = await User.findOne({ email }).select('+password -avatar');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect password or email', 401));
    }

    user.active = true;
    await user.save({
      validateBeforeSave: false
    });
    createSendToken(user, 200, res);
  }
);

const refreshToken = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies.jwt) {
    return next(new AppError(`Unauthorized`, 401));
  }

  // Destructuring refreshToken from cookie
  const refreshToken = req.cookies.jwt;

  // Verifying refresh token
  const decoded: TokenPayload = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET as string
  ) as TokenPayload;

  // Finding the user by the decoded _id
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError(`The token belonging to this user does no longer exist`, 401));
  }

  // Create a new access token
  const accessToken = signToken(
    user._id,
    process.env.JWT_ACCESS_SECRET as string,
    process.env.JWT_ACCESS_EXPIRES_IN as string
  );

  // Send the new access token as part of the response body
  res.status(200).json({
    status: 'success',
    token: accessToken,
    data: {
      user
    }
  });
});

const protect = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1) Get token and check if it exits
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return next(new AppError(`You're not logged in! Please log in to access this page`, 403));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: TokenPayload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as TokenPayload;
    // 2) Check if user still exists
    const user: IUser | null = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError(`The user belonging to this token does no longer exist.`, 401));
    }

    // 3) Check if user changed password after
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError(`User recently changed password! Please log in again.`, 401));
    }
    // 4) Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError(`Invalid token. Please log in again.`, 401));
  }
});

const forgotPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1) Get user from POSTed request email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`There is no user with email address`, 404));
  }

  // 2) Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL: string = `https://nhom-18-e-library.vercel.app/landing/reset/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message:
        'Token sent successfully. Please check your gmail. If you do not get any gmail to reset password. Please check again your email or contact us'
    });
  } catch (err) {
    user.passwordResetExpires = undefined;
    user.passwordResetToken = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError(`There was an error sending email. Try again later!`));
  }
});

const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // 1) Get user based on token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user: IUser | null = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() }
  });

  if (!user) {
    return next(new AppError(MESSAGES.TOKEN_IS_INVALID_OR_EXPIRED, HTTP_STATUS.BAD_REQUEST));
  }

  // 2) If token has not expired, and there is user, set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  // 3) Update changedPasswordAt property for the user in the middleware of User
  await user.save();
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

const logOut = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  res.cookie('jwt', '', {
    // expires: new Date(Date.now() - 10 * 1000)
    // httpOnly: true
  });

  // delete req.headers.authorization;
  res.status(200).json({
    status: 'success'
  });
});

const restrictTo = (...roles: string[]) => {
  return catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`You don't have permission to perform this action`, 403));
    }
    next();
  });
};

const updatePassword = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1) Get User from database
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError(`This user no longer exists!!`, 404));
  }

  // 2) Check current user password with password stored in database
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(`Your current password is wrong. Please try again`, 401));
  }

  // 3) If so, update the current password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

const OAuthGoogle = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.query;
  const { access_token, id_token } = await getOAuthGoogleToken(code as string);
  const userInfo: GoogleUserResult | null = await getGoogleUserInfo(access_token, id_token);
  if (!userInfo.email_verified) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: MESSAGES.EMAIL_IS_NOT_VERIFIED
    });
  }

  const user: IUser | null = await User.findOne({ email: userInfo.email });
  if (user) {
    createSendToken(user, 200, res);
  } else {
    const randomPassword = Math.random().toString(36).substring(2);
    const newUser = new User({
      email: userInfo.email,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      avatar_url: userInfo.picture,
      password: randomPassword,
      passwordConfirm: randomPassword
    });
    await newUser.save();
    createSendToken(newUser, 200, res);
  }
});

export default {
  signUp,
  logIn,
  logOut,
  protect,
  restrictTo,
  refreshToken,
  forgotPassword,
  resetPassword,
  updatePassword,
  OAuthGoogle
};
