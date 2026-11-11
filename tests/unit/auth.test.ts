import { describe, it, expect } from 'vitest';
import { authService } from '../../src/modules/auth/auth.service';
import { hospitalService, DEV_DEFAULT_CLIENT } from '../../src/modules/hospital/hospital.service';
import { abdmAuthService } from '../../src/integrations/abdm/abdm.auth';

describe('Module 1 & 5: Authentication Services Unit Tests', () => {
  it('should authenticate development hospital client with valid credentials', async () => {
    const result = await authService.generateClientToken(
      DEV_DEFAULT_CLIENT.clientId,
      DEV_DEFAULT_CLIENT.clientSecret
    );

    expect(result).toBeDefined();
    expect(result.tokenType).toBe('bearer');
    expect(typeof result.accessToken).toBe('string');
    expect(result.client.clientId).toBe(DEV_DEFAULT_CLIENT.clientId);

    // Verify token decoding
    const decoded = authService.verifyToken(result.accessToken);
    expect(decoded.clientId).toBe(DEV_DEFAULT_CLIENT.clientId);
    expect(decoded.hospitalId).toBe(DEV_DEFAULT_CLIENT.hospitalId);
  });

  it('should reject invalid client secret', async () => {
    await expect(
      authService.generateClientToken(DEV_DEFAULT_CLIENT.clientId, 'wrong_secret_1234')
    ).rejects.toThrow('Invalid client credentials');
  });

  it('should reject unknown client ID', async () => {
    await expect(
      authService.generateClientToken('cli_unknown_nonexistent', 'any_secret')
    ).rejects.toThrow('Invalid client credentials');
  });

  it('should support provisioning a new hospital client and verifying its token', async () => {
    const provisionResult = await hospitalService.createConnectorClient({
      hospitalId: 'hosp_test_apollo',
      name: 'Apollo Hospital Bangalore',
    });

    expect(provisionResult.clientId).toMatch(/^cli_/);
    expect(provisionResult.clientSecret).toMatch(/^sec_/);

    // Authenticate with newly provisioned credentials
    const tokenResult = await authService.generateClientToken(
      provisionResult.clientId,
      provisionResult.clientSecret
    );

    expect(tokenResult.accessToken).toBeDefined();
    expect(tokenResult.client.clientId).toBe(provisionResult.clientId);
  });

  it('should reject authentication for disabled clients', async () => {
    const newClient = await hospitalService.createConnectorClient({
      hospitalId: 'hosp_test_disabled',
      name: 'Disabled Hospital Client',
    });

    // Disable the client
    await hospitalService.setClientStatus(newClient.clientId, false);

    await expect(
      authService.generateClientToken(newClient.clientId, newClient.clientSecret)
    ).rejects.toThrow('Connector client is disabled');
  });

  it('should correctly track ABDM token validity and invalidation', () => {
    abdmAuthService.invalidateToken();
    expect(abdmAuthService.isTokenValid()).toBe(false);
  });
});
