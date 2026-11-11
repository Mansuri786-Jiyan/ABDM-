import { describe, it, expect } from 'vitest';
import {
  SearchAbhaByMobileSchema,
  RequestFaceAuthLoginSchema,
  CapturePidSchema,
  VerifyFaceLoginSchema,
  InitFaceEnrollmentSchema,
  EnrolByFaceSchema,
} from '../../src/modules/abha/abha.validation';

describe('Face Auth Validation & Unit Tests', () => {
  it('should validate search by mobile payload', () => {
    const valid = SearchAbhaByMobileSchema.safeParse({ mobile: '9876543210' });
    expect(valid.success).toBe(true);

    const invalid = SearchAbhaByMobileSchema.safeParse({ mobile: '12345' });
    expect(invalid.success).toBe(false);
  });

  it('should validate request face auth login payload', () => {
    const valid = RequestFaceAuthLoginSchema.safeParse({
      abdmTxnId: 'test-txn-123',
      index: 1,
    });
    expect(valid.success).toBe(true);

    const validUuid = RequestFaceAuthLoginSchema.safeParse({
      transactionId: '123e4567-e89b-12d3-a456-426614174000',
      index: '2',
    });
    expect(validUuid.success).toBe(true);

    const invalid = RequestFaceAuthLoginSchema.safeParse({
      index: 1,
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate capture PID payload', () => {
    const valid = CapturePidSchema.safeParse({
      abdmTxnId: 'test-txn-456',
      scopeType: 'login',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.scopeType).toBe('login');
    }

    const validEnrol = CapturePidSchema.safeParse({
      abdmTxnId: 'test-txn-456',
      scopeType: 'enrol',
    });
    expect(validEnrol.success).toBe(true);
  });

  it('should validate verify face login payload', () => {
    const valid = VerifyFaceLoginSchema.safeParse({
      abdmTxnId: 'test-txn-789',
      faceAuthPid: 'PFBpZERhdGE+...',
    });
    expect(valid.success).toBe(true);

    const invalid = VerifyFaceLoginSchema.safeParse({
      abdmTxnId: 'test-txn-789',
      faceAuthPid: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate enrol by face payload', () => {
    const valid = EnrolByFaceSchema.safeParse({
      aadhaar: '123456789012',
      rdPidData: 'sample-rd-pid-data',
      mobile: '9876543210',
    });
    expect(valid.success).toBe(true);

    const invalidMobile = EnrolByFaceSchema.safeParse({
      aadhaar: '123456789012',
      rdPidData: 'sample-rd-pid-data',
      mobile: '987',
    });
    expect(invalidMobile.success).toBe(false);
  });
});
