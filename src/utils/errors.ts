export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly transactionId?: string;
  public readonly originalAbdmCode?: string;
  public readonly details?: any;

  constructor(
    paramsOrMessage:
      | string
      | {
          message: string;
          statusCode?: number;
          code?: string;
          transactionId?: string;
          originalAbdmCode?: string;
          details?: any;
        },
    statusCode?: number,
    code?: string
  ) {
    if (typeof paramsOrMessage === 'string') {
      super(paramsOrMessage);
      this.statusCode = statusCode || 500;
      this.code = code || 'INTERNAL_SERVER_ERROR';
    } else {
      super(paramsOrMessage.message);
      this.statusCode = paramsOrMessage.statusCode || 500;
      this.code = paramsOrMessage.code || 'INTERNAL_SERVER_ERROR';
      this.transactionId = paramsOrMessage.transactionId;
      this.originalAbdmCode = paramsOrMessage.originalAbdmCode;
      this.details = paramsOrMessage.details;
    }
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ErrorCodes = {
  // Client Authentication Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CLIENT_CREDENTIALS: 'INVALID_CLIENT_CREDENTIALS',
  CLIENT_INACTIVE: 'CLIENT_INACTIVE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_AADHAAR: 'INVALID_AADHAAR',
  INVALID_MOBILE: 'INVALID_MOBILE',
  INVALID_OTP: 'INVALID_OTP',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  TRANSACTION_EXPIRED: 'TRANSACTION_EXPIRED',
  INVALID_TRANSACTION_STATE: 'INVALID_TRANSACTION_STATE',

  // ABDM Integration Errors
  ABDM_AUTH_ERROR: 'ABDM_AUTH_ERROR',
  ABDM_CERTIFICATE_ERROR: 'ABDM_CERTIFICATE_ERROR',
  ABDM_ENCRYPTION_ERROR: 'ABDM_ENCRYPTION_ERROR',
  ABDM_GATEWAY_TIMEOUT: 'ABDM_GATEWAY_TIMEOUT',
  ABDM_SERVICE_UNAVAILABLE: 'ABDM_SERVICE_UNAVAILABLE',
  ABDM_BAD_GATEWAY: 'ABDM_BAD_GATEWAY',
  ABDM_API_ERROR: 'ABDM_API_ERROR',
  ABDM_RATE_LIMIT: 'ABDM_RATE_LIMIT',

  // Internal Server Errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
