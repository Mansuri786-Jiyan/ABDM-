import { describe, it, expect } from 'vitest';
import { maskSensitiveData } from '../../src/utils/logger';
import { AppError, ErrorCodes } from '../../src/utils/errors';

describe('Module 8: Error Handling and Data Masking Unit Tests', () => {
  it('should mask 12-digit Aadhaar numbers in logs', () => {
    const raw = {
      message: 'Requesting OTP',
      aadhaar: '123456789012',
      normalField: 'Hospital A',
    };

    const masked = maskSensitiveData(raw);
    expect(masked.aadhaar).toBe('[REDACTED]');
    expect(masked.normalField).toBe('Hospital A');
  });

  it('should mask OTP and client secret fields', () => {
    const raw = {
      otp: '123456',
      otpValue: '654321',
      clientSecret: 'secret123',
      accessToken: 'jwt.token.here',
    };

    const masked = maskSensitiveData(raw);
    expect(masked.otp).toBe('[REDACTED]');
    expect(masked.otpValue).toBe('[REDACTED]');
    expect(masked.clientSecret).toBe('[REDACTED]');
    expect(masked.accessToken).toBe('[REDACTED]');
  });

  it('should properly format AppError with standard fields', () => {
    const err = new AppError({
      message: 'Unable to authenticate with ABDM',
      statusCode: 401,
      code: ErrorCodes.ABDM_AUTH_ERROR,
      transactionId: 'txn-uuid-888',
      originalAbdmCode: 'ABDM-1001',
    });

    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.ABDM_AUTH_ERROR);
    expect(err.transactionId).toBe('txn-uuid-888');
    expect(err.originalAbdmCode).toBe('ABDM-1001');
    expect(err.message).toBe('Unable to authenticate with ABDM');
  });
});
