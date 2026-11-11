import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { encryptionService } from '../../src/modules/encryption/encryption.service';

describe('Module 2: Encryption Service Unit Tests', () => {
  // Generate a temporary 2048-bit RSA test keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  it('should format raw base64 string without PEM headers into valid PEM', () => {
    const rawBase64 = publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');

    const formatted = encryptionService.formatPublicKeyToPem(rawBase64);
    expect(formatted).toContain('-----BEGIN PUBLIC KEY-----');
    expect(formatted).toContain('-----END PUBLIC KEY-----');
    expect(() => crypto.createPublicKey(formatted)).not.toThrow();
  });

  it('should encrypt sensitive string using RSA/ECB/OAEPWithSHA-1AndMGF1Padding and return valid Base64', () => {
    const testAadhaar = '999999990019';
    const encryptedBase64 = encryptionService.encrypt(testAadhaar, publicKey);

    expect(typeof encryptedBase64).toBe('string');
    expect(encryptedBase64.length).toBeGreaterThan(50);
    // Verify valid base64 pattern
    expect(/^[A-Za-z0-9+/=]+$/.test(encryptedBase64)).toBe(true);

    // Decrypt using private key with exact same padding to verify authenticity
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha1',
        mgf1Hash: 'sha1',
      } as any,
      Buffer.from(encryptedBase64, 'base64')
    );

    expect(decrypted.toString('utf8')).toBe(testAadhaar);
  });

  it('should throw error when encrypting empty string', () => {
    expect(() => encryptionService.encrypt('', publicKey)).toThrow('Value to encrypt cannot be empty');
  });

  it('should cache and retrieve public key correctly', () => {
    encryptionService.setCachedPublicKey(publicKey);
    const cached = encryptionService.getCachedPublicKey();
    expect(cached?.trim()).toBe(publicKey.trim());
  });
});
