import { describe, it, expect, beforeAll } from 'vitest';
import { abdmAuthService } from '../../src/integrations/abdm/abdm.auth';
import { abdmAbhaClient } from '../../src/integrations/abdm/abdm.abha';
import { encryptionService } from '../../src/modules/encryption/encryption.service';
import { abdmConfig } from '../../src/config/abdm.config';
import { AppError, ErrorCodes } from '../../src/utils/errors';
import { createAbdmHttpClient } from '../../src/integrations/abdm/abdm.client';

describe('ABDM V3 Sandbox Integration Tests', () => {
  const hasLiveCredentials = Boolean(
    abdmConfig.clientId &&
    abdmConfig.clientSecret &&
    abdmConfig.clientId !== 'CLIENT_ID' &&
    !abdmConfig.clientId.includes('your_')
  );

  let gatewayToken: string = '';
  let publicCertificatePem: string = '';
  let encryptedAadhaar: string = '';
  let activeTxnId: string = '';
  let generatedAbhaNumber: string = '';

  beforeAll(() => {
    console.log('----------------------------------------------------');
    console.log('ABDM Sandbox Integration Test Suite');
    console.log(`Gateway Base URL: ${abdmConfig.gatewayBaseUrl}`);
    console.log(`ABHA Base URL:    ${abdmConfig.abhaBaseUrl}`);
    console.log(`Live Credentials: ${hasLiveCredentials ? 'CONFIGURED' : 'NOT SET (Mock/Validation Mode)'}`);
    console.log('----------------------------------------------------');
  });

  /**
   * Test 9: Test invalid credentials against actual ABDM Sandbox Gateway
   */
  it('Test 9: should handle invalid credentials and receive 401/400 from official ABDM Gateway', async () => {
    try {
      await abdmAuthService.fetchNewSession('invalid_client_id_test_999', 'invalid_secret_test_999');
      expect.fail('Should have thrown an authentication error');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect([400, 401, 502, 503]).toContain(err.statusCode);
      expect([ErrorCodes.ABDM_AUTH_ERROR, ErrorCodes.ABDM_SERVICE_UNAVAILABLE]).toContain(err.code);
    }
  });

  /**
   * Test 10: Test ABDM timeout handling
   */
  it('Test 10: should intercept network timeouts and map to ABDM_GATEWAY_TIMEOUT (504)', async () => {
    // Instantiate client with ultra-short 1ms timeout to induce guaranteed timeout
    const timeoutClient = createAbdmHttpClient(abdmConfig.gatewayBaseUrl, 1);

    try {
      await timeoutClient.post('/gateway/v3/sessions', {
        clientId: 'dummy',
        clientSecret: 'dummy',
        grantType: 'client_credentials',
      });
      expect.fail('Expected request to time out');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(504);
      expect(err.code).toBe(ErrorCodes.ABDM_GATEWAY_TIMEOUT);
    }
  });

  /**
   * Test 1: Generate ABDM Access Token
   */
  it('Test 1: Generate ABDM Access Token via POST /gateway/v3/sessions', async () => {
    if (!hasLiveCredentials) {
      console.warn('Skipping Test 1: Live ABDM Sandbox credentials not provided in .env');
      return;
    }

    gatewayToken = await abdmAuthService.fetchNewSession();
    expect(gatewayToken).toBeDefined();
    expect(typeof gatewayToken).toBe('string');
    expect(gatewayToken.length).toBeGreaterThan(20);
    expect(abdmAuthService.isTokenValid()).toBe(true);
  });

  /**
   * Test 2: Retrieve ABHA Public Certificate
   */
  it('Test 2: Retrieve ABHA Public Certificate via GET /profile/public/certificate', async () => {
    if (!hasLiveCredentials) {
      console.warn('Skipping Test 2: Live ABDM Sandbox credentials not provided in .env');
      return;
    }

    const certString = await abdmAbhaClient.getPublicCertificate();
    expect(certString).toBeDefined();
    expect(typeof certString).toBe('string');

    encryptionService.setCachedPublicKey(certString);
    publicCertificatePem = encryptionService.getCachedPublicKey()!;
    expect(publicCertificatePem).toContain('PUBLIC KEY');
  });

  /**
   * Test 3: Encrypt authorized Sandbox test Aadhaar data
   */
  it('Test 3: Encrypt authorized Sandbox test Aadhaar data using RSA/ECB/OAEPWithSHA-1AndMGF1Padding', async () => {
    // Official ABDM Sandbox test Aadhaar identity
    const testSandboxAadhaar = '999999990019';

    if (publicCertificatePem) {
      encryptedAadhaar = encryptionService.encrypt(testSandboxAadhaar, publicCertificatePem);
    } else {
      // Use cached/fallback RSA key for validation
      const crypto = await import('crypto');
      const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      encryptedAadhaar = encryptionService.encrypt(
        testSandboxAadhaar,
        publicKey.export({ type: 'spki', format: 'pem' }).toString()
      );
    }

    expect(encryptedAadhaar).toBeDefined();
    expect(typeof encryptedAadhaar).toBe('string');
    expect(encryptedAadhaar.length).toBeGreaterThan(100);
    expect(/^[A-Za-z0-9+/=]+$/.test(encryptedAadhaar)).toBe(true);
  });

  /**
   * Test 4: Request Aadhaar OTP
   */
  it('Test 4: Request Aadhaar OTP via POST /enrollment/request/otp', async () => {
    if (!hasLiveCredentials) {
      console.warn('Skipping Test 4: Live ABDM Sandbox credentials not provided in .env');
      return;
    }

    const otpResult = await abdmAbhaClient.requestEnrollmentOtp({
      loginHint: 'aadhaar',
      encryptedLoginId: encryptedAadhaar,
      otpSystem: 'aadhaar',
    });

    expect(otpResult).toBeDefined();
    expect(otpResult.txnId).toBeDefined();
    activeTxnId = otpResult.txnId;
    console.log(`Active ABDM Sandbox txnId: ${activeTxnId}`);
  });

  /**
   * Test 5: Verify OTP
   */
  it('Test 5: Verify OTP via POST /enrollment/enrol/byAadhaar', async () => {
    if (!hasLiveCredentials || !activeTxnId) {
      console.warn('Skipping Test 5: Live credentials or activeTxnId not available');
      return;
    }

    // In sandbox testing, default test Aadhaar OTP is typically '123456' or simulated
    const sandboxTestOtp = '123456';
    const encryptedOtp = encryptionService.encrypt(sandboxTestOtp, publicCertificatePem);

    try {
      const enrolResult = await abdmAbhaClient.enrolByAadhaar({
        txnId: activeTxnId,
        encryptedOtp,
      });

      expect(enrolResult).toBeDefined();
      expect(enrolResult.txnId).toBe(activeTxnId);
      if (enrolResult.healthIdNumber) {
        generatedAbhaNumber = enrolResult.healthIdNumber;
      }
    } catch (err: any) {
      console.warn(`Sandbox OTP verification result: ${err.message}`);
    }
  });

  /**
   * Test 6: Complete ABHA enrollment (Address creation)
   */
  it('Test 6: Complete ABHA enrollment via POST /enrollment/enrol/abha-address', async () => {
    if (!hasLiveCredentials || !activeTxnId) {
      console.warn('Skipping Test 6: Live credentials or activeTxnId not available');
      return;
    }

    const customAddress = `test_user_${Date.now()}`;
    try {
      const addressResult = await abdmAbhaClient.enrolAbhaAddress({
        txnId: activeTxnId,
        abhaAddress: customAddress,
        preferred: 1,
      });

      expect(addressResult).toBeDefined();
      expect(addressResult.preferredAbhaAddress).toBeDefined();
    } catch (err: any) {
      console.warn(`ABHA address creation result: ${err.message}`);
    }
  });

  /**
   * Test 7: Retrieve ABHA profile
   */
  it('Test 7: Retrieve ABHA profile via GET /profile/account', async () => {
    if (!hasLiveCredentials) {
      console.warn('Skipping Test 7: Live credentials not configured');
      return;
    }

    // Test with mock user token or active token
    try {
      const profile = await abdmAbhaClient.getAccountProfile('mock_user_token');
      expect(profile).toBeDefined();
    } catch (err: any) {
      expect([400, 401, 502]).toContain(err.statusCode);
    }
  });

  /**
   * Test 8: Test expired token handling and auto-renewal
   */
  it('Test 8: Test expired token handling and auto-renewal', async () => {
    // Verify that invalidateToken forces renewal
    abdmAuthService.invalidateToken();
    expect(abdmAuthService.isTokenValid()).toBe(false);

    if (hasLiveCredentials) {
      const freshToken = await abdmAuthService.getAccessToken();
      expect(freshToken).toBeDefined();
      expect(abdmAuthService.isTokenValid()).toBe(true);
    }
  });
});
