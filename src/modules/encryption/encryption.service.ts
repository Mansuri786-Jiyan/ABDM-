import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export class EncryptionService {
  private cachedPublicKey: string | null = null;
  private cachedAt: number | null = null;
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Format any public key / certificate representation into a standard PEM public key
   */
  public formatPublicKeyToPem(key: string): string {
    const trimmed = key.trim();

    // Already in standard PEM format
    if (trimmed.includes('-----BEGIN PUBLIC KEY-----')) {
      return trimmed;
    }

    // If it is an X.509 certificate (-----BEGIN CERTIFICATE-----)
    if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
      try {
        const cert = new crypto.X509Certificate(trimmed);
        return cert.publicKey.export({ type: 'spki', format: 'pem' }).toString();
      } catch (err: any) {
        logger.error('Failed to extract public key from X.509 certificate', { error: err.message });
        throw new AppError({
          message: 'Invalid X.509 certificate format',
          code: ErrorCodes.ABDM_CERTIFICATE_ERROR,
          statusCode: 500,
        });
      }
    }

    // If it's a raw base64 string without headers
    const cleaned = trimmed.replace(/\r?\n|\r/g, '');
    const chunked = cleaned.match(/.{1,64}/g)?.join('\n') || cleaned;
    const pem = `-----BEGIN PUBLIC KEY-----\n${chunked}\n-----END PUBLIC KEY-----`;

    // Validate if Node crypto can parse it
    try {
      crypto.createPublicKey(pem);
      return pem;
    } catch {
      // It might be a certificate without headers
      const certPem = `-----BEGIN CERTIFICATE-----\n${chunked}\n-----END CERTIFICATE-----`;
      try {
        const cert = new crypto.X509Certificate(certPem);
        return cert.publicKey.export({ type: 'spki', format: 'pem' }).toString();
      } catch (innerErr: any) {
        throw new AppError({
          message: 'Unable to parse public key or certificate from ABDM',
          code: ErrorCodes.ABDM_CERTIFICATE_ERROR,
          statusCode: 500,
          details: innerErr.message,
        });
      }
    }
  }

  /**
   * Set and cache the public certificate / key
   */
  public setCachedPublicKey(key: string): void {
    const pem = this.formatPublicKeyToPem(key);
    this.cachedPublicKey = pem;
    this.cachedAt = Date.now();
    logger.info('ABDM public encryption certificate cached successfully.');
  }

  /**
   * Get cached public key or null if expired or not set
   */
  public getCachedPublicKey(): string | null {
    if (!this.cachedPublicKey || !this.cachedAt) return null;
    if (Date.now() - this.cachedAt > this.CACHE_TTL_MS) {
      this.cachedPublicKey = null;
      this.cachedAt = null;
      return null;
    }
    return this.cachedPublicKey;
  }

  /**
   * Encrypt sensitive value using RSA/ECB/OAEPWithSHA-1AndMGF1Padding
   * Returns base64 encoded string
   */
  public encrypt(valueToEncrypt: string, publicKeyPem?: string): string {
    if (!valueToEncrypt) {
      throw new AppError({
        message: 'Value to encrypt cannot be empty',
        code: ErrorCodes.ABDM_ENCRYPTION_ERROR,
        statusCode: 400,
      });
    }

    const key = publicKeyPem ? this.formatPublicKeyToPem(publicKeyPem) : this.getCachedPublicKey();

    if (!key) {
      throw new AppError({
        message: 'No ABDM public encryption key available. Fetch certificate first.',
        code: ErrorCodes.ABDM_CERTIFICATE_ERROR,
        statusCode: 500,
      });
    }

    try {
      const bufferToEncrypt = Buffer.from(valueToEncrypt, 'utf8');

      // RSA/ECB/OAEPWithSHA-1AndMGF1Padding
      const encryptOptions: any = {
        key: key,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha1',
        mgf1Hash: 'sha1',
      };
      const encryptedBuffer = crypto.publicEncrypt(encryptOptions, bufferToEncrypt);

      return encryptedBuffer.toString('base64');
    } catch (error: any) {
      // NEVER log valueToEncrypt
      logger.error('Encryption failed using RSA OAEP SHA-1', {
        errorMessage: error.message,
      });
      throw new AppError({
        message: 'Encryption of sensitive payload failed',
        code: ErrorCodes.ABDM_ENCRYPTION_ERROR,
        statusCode: 500,
        details: error.message,
      });
    }
  }
}

export const encryptionService = new EncryptionService();
