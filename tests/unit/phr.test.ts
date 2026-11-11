import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phrService } from '../../src/modules/phr/phr.service';
import { abdmAuthService } from '../../src/integrations/abdm/abdm.auth';

describe('PHR / HID Registration, Fingerprint & Account Recovery Tests', () => {
  const sampleMobile = '9999999999';
  const sampleAadhaar = '000000000000';

  beforeEach(() => {
    vi.spyOn(abdmAuthService, 'getAccessToken').mockResolvedValue('mock_token_phr_unit_test');
  });

  it('should generate mobile OTP for document-based registration', async () => {
    const res = await phrService.generateDocumentMobileOtp(sampleMobile);
    expect(res).toBeDefined();
    expect(res.txnId).toBeDefined();
  });

  it('should verify document mobile OTP', async () => {
    const otpRes = await phrService.generateDocumentMobileOtp(sampleMobile);
    const verifyRes = await phrService.verifyDocumentMobileOtp({
      otp: '123456',
      txnId: otpRes.txnId,
    });
    expect(verifyRes).toBeDefined();
    expect(verifyRes.verified).toBe(true);
  });

  it('should validate Driving License document', async () => {
    const valRes = await phrService.validateDocument({
      documentType: 'DRIVING_LICENCE',
      documentNumber: 'DL0000000000000',
      firstName: 'Demo',
      lastName: 'Patient',
      gender: 'M',
      yearOfBirth: 2000,
    });
    expect(valRes).toBeDefined();
    expect(valRes.valid).toBe(true);
  });

  it('should create ABHA using verified document', async () => {
    const docRes = await phrService.createHealthIdWithDocument({
      txnId: 'txn-doc-123',
      documentType: 'DRIVING_LICENCE',
      documentNumber: 'DL0000000000000',
      firstName: 'Demo',
      lastName: 'Patient',
      gender: 'M',
      mobile: sampleMobile,
      yearOfBirth: 2000,
      stateCode: 24,
    });
    expect(docRes).toBeDefined();
    expect(docRes.healthIdNumber).toBeDefined();
    expect(docRes.name).toContain('Demo');
  });

  it('should initiate biometric authentication for ABHA', async () => {
    const initRes = await phrService.initAuth({
      healthid: 'demopatient@sbx',
      authMethod: 'AADHAAR_BIO',
    });
    expect(initRes).toBeDefined();
    expect(initRes.txnId).toBeDefined();
  });

  it('should confirm authentication with Fingerprint Biometrics (FMR PID)', async () => {
    const confirmRes = await phrService.confirmFingerprint({
      authType: 'FINGERSCAN',
      bioType: 'FMR',
      pid: 'PD94bWwgdmVyc2lvbj0iMS4wIj8+DQo8UGlkRGF0YT4NCiAgPFJlc3AgZXJyQ29kZT0iMCIgZXJySW5mbz0iU3VjY2VzcyIgZkNvdW50PSIxIiBmVHlwZT0iMCIgbm1Qb2ludHM9IjM5IiBxU2NvcmU9IjY4IiAvPg0KICA8RGV2aWNlSW5mbyBkcElkPSJNQU5UUkEuTVNJUEwiIHJkc0lkPSJNQU5UUkEuV0lOLjAwMSIgcmRzVmVyPSIxLjAuMyIgbWk9Ik1GUzEwMCIgbWM9Ik1JSUVHRENDQXdDZ0F3SUJBZ0lFQWdiTWdEQU5CZ2txaGtpRzl3MEJBUXNGQURDQjZqRXFNQ2dHQTFVRUF4TWhSRk1nVFdGdWRISmhJRk52Wm5SbFkyZ2dTVzVrYVdFZ1VIWjBJRXgwWkNBM01VTZXMG1SZz08L0RhdGE+DQo8L1BpZERhdGE+',
      txnId: 'txn-bio-fingerprint-001',
    });
    expect(confirmRes).toBeDefined();
    expect(confirmRes.status).toBe('AUTHENTICATED');
    expect(confirmRes.token).toBeDefined();
  });

  it('should recover forgotten Health ID via Mobile OTP', async () => {
    const otpRes = await phrService.forgotHealthIdMobileOtp(sampleMobile);
    expect(otpRes.txnId).toBeDefined();

    const verifyRes = await phrService.forgotHealthIdMobileVerify({
      txnId: otpRes.txnId,
      otp: 123456,
      name: 'Demo Patient',
      yearOfBirth: 2000,
      gender: 'M',
    });
    expect(verifyRes).toBeDefined();
    expect(verifyRes.healthIdNumber).toBe('91-0000-0000-0000');
    expect(verifyRes.healthId).toBe('patient@sbx');
  });

  it('should recover forgotten Health ID via Aadhaar OTP', async () => {
    const otpRes = await phrService.forgotHealthIdAadhaarOtp(sampleAadhaar);
    expect(otpRes.txnId).toBeDefined();

    const verifyRes = await phrService.forgotHealthIdAadhaarVerify({
      txnId: otpRes.txnId,
      otp: 123456,
    });
    expect(verifyRes).toBeDefined();
    expect(verifyRes.healthIdNumber).toBe('91-0000-0000-0000');
  });

  it('should download ABHA Card as QR code, PNG, and SVG', async () => {
    const qr = await phrService.getCard('qr');
    expect(qr.data).toBeDefined();

    const png = await phrService.getCard('png');
    expect(png.mimeType).toBe('image/png');

    const svg = await phrService.getCard('svg');
    expect(svg.mimeType).toBe('image/svg+xml');
  });

  it('should fetch Indian States and Districts from LGD Directory', async () => {
    const states = await phrService.getLgdStates();
    expect(Array.isArray(states)).toBe(true);
    expect(states.length).toBeGreaterThan(0);

    const districts = await phrService.getLgdDistricts(24); // Gujarat
    expect(Array.isArray(districts)).toBe(true);
    expect(districts.some((d: any) => d.districtName === 'Ahmedabad')).toBe(true);
  });
});
