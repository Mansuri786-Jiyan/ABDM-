import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const transactionId = err.transactionId || (req.body && req.body.transactionId) || undefined;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Request validation failed', {
      path: req.originalUrl,
      errors: formattedErrors,
      transactionId,
    });

    res.status(400).json({
      success: false,
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Request payload validation failed',
      transactionId,
      details: formattedErrors,
    });
    return;
  }

  // Handle AppError
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}]: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      originalAbdmCode: err.originalAbdmCode,
      transactionId,
      path: req.originalUrl,
    });

    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      transactionId,
      ...(process.env.NODE_ENV !== 'production' && err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Handle uncaught or third-party errors
  logger.error('Unhandled Server Error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    transactionId,
  });

  res.status(500).json({
    success: false,
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unexpected internal error occurred. Please contact system administrator.',
    transactionId,
  });
}
