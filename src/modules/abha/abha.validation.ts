import { z } from 'zod';

export const RequestEnrollmentOtpSchema = z.object({
  authMethod: z.enum(['aadhaar', 'mobile']).default('aadhaar'),
  // 12-digit Aadhaar number, 10-digit mobile number, or pre-encrypted base64 string
  loginId: z
    .string()
    .min(10, 'Login identifier must be at least 10 characters')
    .refine((val) => {
      // If numeric, check length
      if (/^\d+$/.test(val)) {
        return val.length === 12 || val.length === 10;
      }
      // If base64 (pre-encrypted)
      return /^[A-Za-z0-9+/=]+$/.test(val) && val.length > 50;
    }, 'Must be a valid 12-digit Aadhaar, 10-digit mobile, or pre-encrypted Base64 payload'),
  patientReferenceId: z.string().optional(),
});

export const VerifyEnrollmentOtpSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  otp: z
    .string()
    .min(4, 'OTP must be at least 4 digits')
    .refine((val) => {
      if (/^\d+$/.test(val)) {
        return val.length === 6;
      }
      return /^[A-Za-z0-9+/=]+$/.test(val) && val.length > 50;
    }, 'Must be a valid 6-digit OTP or pre-encrypted Base64 payload'),
  mobile: z
    .string()
    .regex(/^\d{10}$/, 'Mobile must be a 10-digit number')
    .optional(),
});

export const CreateAbhaAddressSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  abhaAddress: z
    .string()
    .min(3, 'ABHA address must be at least 3 characters')
    .max(32, 'ABHA address cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9._]+$/, 'ABHA address can only contain alphanumeric characters, dots, and underscores'),
  preferred: z.number().int().min(0).max(1).default(1),
});

export const RequestLoginOtpSchema = z.object({
  authMethod: z.enum(['mobile', 'aadhaar', 'abha-number']).default('mobile'),
  loginId: z.string().min(10, 'Identifier must be at least 10 digits'),
});

export const VerifyLoginOtpSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  otp: z.string().min(6, 'OTP must be at least 6 digits'),
});

export const RequestMobileLinkingOtpSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
});

export const VerifyMobileLinkingOtpSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  otp: z.string().min(6, 'OTP must be at least 6 digits'),
});

export const SearchAbhaByMobileSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a valid 10-digit number'),
});

export const RequestFaceAuthLoginSchema = z
  .object({
    transactionId: z.string().uuid().optional(),
    abdmTxnId: z.string().optional(),
    index: z.union([z.number(), z.string()]),
  })
  .refine((data) => data.transactionId || data.abdmTxnId, {
    message: 'Either transactionId or abdmTxnId is required',
  });

export const CapturePidSchema = z
  .object({
    transactionId: z.string().uuid().optional(),
    abdmTxnId: z.string().optional(),
    scopeType: z.enum(['login', 'enrol']).default('login'),
  })
  .refine((data) => data.transactionId || data.abdmTxnId, {
    message: 'Either transactionId or abdmTxnId is required',
  });

export const VerifyFaceLoginSchema = z
  .object({
    transactionId: z.string().uuid().optional(),
    abdmTxnId: z.string().optional(),
    faceAuthPid: z.string().min(1, 'faceAuthPid is required'),
  })
  .refine((data) => data.transactionId || data.abdmTxnId, {
    message: 'Either transactionId or abdmTxnId is required',
  });

export const InitFaceEnrollmentSchema = z.object({
  patientReferenceId: z.string().optional(),
});

export const EnrolByFaceSchema = z.object({
  transactionId: z.string().uuid().optional(),
  abdmTxnId: z.string().optional(),
  aadhaar: z.string().min(12, 'Aadhaar must be at least 12 digits or pre-encrypted base64'),
  rdPidData: z.string().min(1, 'rdPidData is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a 10-digit number'),
});

export const ScanUserAbhaQrSchema = z.object({
  qrCode: z.string().min(3, 'qrCode string is required'),
  autoRegister: z.boolean().optional().default(true),
  patientReferenceId: z.string().optional(),
  hipId: z.string().optional(),
});

export const RequestDlEnrollmentOtpSchema = z.object({
  mobile: z
    .string()
    .min(10, 'Mobile must be at least 10 digits')
    .refine((val) => {
      if (/^\d+$/.test(val)) {
        return val.length === 10;
      }
      return /^[A-Za-z0-9+/=]+$/.test(val) && val.length > 50;
    }, 'Must be a valid 10-digit mobile number or pre-encrypted Base64 payload'),
  patientReferenceId: z.string().optional(),
});

export const VerifyDlEnrollmentOtpSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  otp: z
    .string()
    .min(4, 'OTP must be at least 4 digits')
    .refine((val) => {
      if (/^\d+$/.test(val)) {
        return val.length === 6;
      }
      return /^[A-Za-z0-9+/=]+$/.test(val) && val.length > 50;
    }, 'Must be a valid 6-digit OTP or pre-encrypted Base64 payload'),
});

export const EnrolByDocumentSchema = z.object({
  transactionId: z.string().uuid('transactionId must be a valid UUID'),
  documentType: z.string().default('DRIVING_LICENCE'),
  documentNumber: z.string().min(4, 'documentNumber is required'),
  firstName: z.string().min(1, 'firstName is required'),
  middleName: z.string().optional(),
  lastName: z.string().optional().default(''),
  dob: z.string().min(4, 'dob (YYYY-MM-DD) is required'),
  gender: z.string().min(1, 'gender (M, F, O) is required'),
  address: z.string().min(1, 'address is required'),
  districtCode: z.string().optional(),
  district: z.string().optional(),
  stateCode: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().min(4, 'pincode is required'),
  mobile: z.string().optional(),
  frontSidePhoto: z.string().optional(),
  backSidePhoto: z.string().optional(),
  autoRegister: z.boolean().optional().default(true),
});


