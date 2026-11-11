import { describe, it, expect } from 'vitest';
import { authController } from '../../src/modules/auth/auth.controller';
import { abhaController } from '../../src/modules/abha/abha.controller';
import { authenticateHospitalClient } from '../../src/middleware/authentication';
import { DEV_DEFAULT_CLIENT } from '../../src/modules/hospital/hospital.service';
import { encryptionService } from '../../src/modules/encryption/encryption.service';
import crypto from 'crypto';

function createMockReqRes(options: {
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  client?: any;
}) {
  let statusCode = 200;
  let jsonResponse: any = null;

  const req: any = {
    body: options.body || {},
    headers: options.headers || {},
    params: options.params || {},
    client: options.client,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonResponse = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getBody: () => jsonResponse,
  };

  return { req, res };
}

describe('Connector API Layer Controllers Integration Tests', () => {
  let token: string = '';

  it('POST /api/v1/auth/token - should exchange valid client credentials for token', async () => {
    const { req, res } = createMockReqRes({
      body: {
        clientId: DEV_DEFAULT_CLIENT.clientId,
        clientSecret: DEV_DEFAULT_CLIENT.clientSecret,
      },
    });

    let nextError: any = null;
    await authController.generateToken(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeNull();
    expect(res.getStatusCode()).toBe(200);
    const body = res.getBody();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.tokenType).toBe('bearer');
    token = body.data.accessToken;
  });

  it('POST /api/v1/auth/token - should reject invalid client secret with 401', async () => {
    const { req, res } = createMockReqRes({
      body: {
        clientId: DEV_DEFAULT_CLIENT.clientId,
        clientSecret: 'wrong_secret',
      },
    });

    let nextError: any = null;
    await authController.generateToken(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeDefined();
    expect(nextError.statusCode).toBe(401);
    expect(nextError.code).toBe('INVALID_CLIENT_CREDENTIALS');
  });

  it('Middleware: authenticateHospitalClient - should allow request with valid Bearer token', async () => {
    const { req, res } = createMockReqRes({
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    let calledNext = false;
    await authenticateHospitalClient(req, res, () => {
      calledNext = true;
    });

    expect(calledNext).toBe(true);
    expect(req.client).toBeDefined();
    expect(req.client.clientId).toBe(DEV_DEFAULT_CLIENT.clientId);
  });

  it('Middleware: authenticateHospitalClient - should reject request without auth headers', async () => {
    const { req, res } = createMockReqRes({});

    let nextError: any = null;
    await authenticateHospitalClient(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeDefined();
    expect(nextError.statusCode).toBe(401);
  });

  it('GET /api/v1/abha/certificate - should return cached certificate when available', async () => {
    const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    encryptionService.setCachedPublicKey(pem);

    const { req, res } = createMockReqRes({
      client: {
        hospitalId: DEV_DEFAULT_CLIENT.hospitalId,
        clientId: DEV_DEFAULT_CLIENT.clientId,
        clientName: DEV_DEFAULT_CLIENT.hospitalName,
      },
    });

    let nextError: any = null;
    await abhaController.getCertificate(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeNull();
    expect(res.getStatusCode()).toBe(200);
    const body = res.getBody();
    expect(body.success).toBe(true);
    expect(body.data.certificate).toContain('PUBLIC KEY');
    expect(body.data.algorithm).toBe('RSA/ECB/OAEPWithSHA-1AndMGF1Padding');
  });

  it('POST /api/v1/abha/enrollment/request-otp - should reject invalid payload (short loginId)', async () => {
    const { req, res } = createMockReqRes({
      body: {
        loginId: '123',
      },
      client: {
        hospitalId: DEV_DEFAULT_CLIENT.hospitalId,
        clientId: DEV_DEFAULT_CLIENT.clientId,
      },
    });

    let nextError: any = null;
    await abhaController.requestEnrollmentOtp(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeDefined();
    expect(nextError.name).toBe('ZodError');
  });
});
