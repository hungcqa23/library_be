import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    name: err.name,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational error
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
    // Programming or other unknown error: don't leak error details
  } else {
    res.status(500).json({
      status: 'fail',
      message: 'Something went very wrong!'
    });
  }
};

const handleCastError = (err: AppError) => {
  const message = `Invalid path.`;
  return new AppError(message, 400);
};

const handleJWTExpiredError = (err: AppError) => {
  return new AppError(`Your token has expired! Please log in again`, 401);
};

const handleDuplicate = (err: AppError) => {
  return new AppError(`This is only an key for this`, 401);
};

export default (err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // let error: AppError = new AppError('Error Failed');
    // if (err.name === 'CastError') error = handleCastError(err);
    // if (err.name === 'TokenExpiredError') error = handleJWTExpiredError(err);
    // if (err.message.startsWith('E11000')) error = handleDuplicate(err);
    // // if (err.name)
    // sendErrorProd(error, res);
    sendErrorDev(err, res);
  }
};
