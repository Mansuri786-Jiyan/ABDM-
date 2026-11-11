import fs from 'fs';
import path from 'path';
import { AxiosInstance } from 'axios';
import { createAbdmHttpClient } from './abdm.client';
import { abdmConfig, ABDM_ENDPOINTS } from '../../config/abdm.config';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';
import { AppError, ErrorCodes } from '../../utils/errors';

export interface ABDMSessionResponse {
  accessToken: string;
  expiresIn: number;
  refreshExpiresIn?: number;
  refreshToken?: string;
  tokenType: string;
}

export class ABDMAuthService {
  private httpClient: AxiosInstance;
  private cachedAccessToken: string | null = null;
  private cachedRefreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private pendingAuthPromise: Promise<string> | null = null;
  private readonly EXPIRY_BUFFER_MS = 60 * 1000; // Refresh 60 seconds before actual expiration
  private tokenCacheFilePath = path.join(process.cwd(), '.abdm-token-cache.json');

  constructor() {
    this.httpClient = createAbdmHttpClient(abdmConfig.gatewayBaseUrl, abdmConfig.timeoutMs);
    this.loadCachedToken();
  }

  private loadCachedToken(): void {
    try {
      if (fs.existsSync(this.tokenCacheFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.tokenCacheFilePath, 'utf8'));
        if (data.accessToken && data.tokenExpiresAt && Date.now() + this.EXPIRY_BUFFER_MS < data.tokenExpiresAt) {
          this.cachedAccessToken = data.accessToken;
          this.cachedRefreshToken = data.refreshToken || null;
          this.tokenExpiresAt = data.tokenExpiresAt;
          logger.info('Loaded valid ABDM session token from disk cache.');
        }
      }
    } catch (e: any) {
      logger.debug('Could not read token cache from disk:', e.message);
    }
  }

  private saveTokenToDisk(session: ABDMSessionResponse, tokenExpiresAt: number): void {
    try {
      fs.writeFileSync(
        this.tokenCacheFilePath,
        JSON.stringify(
          {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken || null,
            tokenExpiresAt,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e: any) {
      logger.debug('Could not write token cache to disk:', e.message);
    }
  }

  /**
   * Check if currently cached token is valid
   */
  public isTokenValid(): boolean {
    if (!this.cachedAccessToken || !this.tokenExpiresAt) {
      return false;
    }
    return Date.now() + this.EXPIRY_BUFFER_MS < this.tokenExpiresAt;
  }

  /**
   * Invalidate cached token (e.g. upon receiving 401 from downstream API)
   */
  public invalidateToken(): void {
    logger.info('Invalidating current ABDM access token.');
    this.cachedAccessToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Get a valid ABDM Gateway Access Token
   * Automatically re-uses cached token, deduplicates concurrent requests, and renews near expiry.
   */
  public async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.isTokenValid() && this.cachedAccessToken) {
      return this.cachedAccessToken;
    }

    // Deduplicate concurrent token requests using single-flight promise
    if (this.pendingAuthPromise) {
      logger.debug('Reusing in-flight ABDM authentication request.');
      return this.pendingAuthPromise;
    }

    this.pendingAuthPromise = this.fetchNewSession()
      .then((token) => {
        this.pendingAuthPromise = null;
        return token;
      })
      .catch((err) => {
        this.pendingAuthPromise = null;
        throw err;
      });

    return this.pendingAuthPromise;
  }

  /**
   * Execute official POST /gateway/v3/sessions to generate session token
   */
  public async fetchNewSession(customClientId?: string, customClientSecret?: string): Promise<string> {
    const clientId = customClientId || abdmConfig.clientId;
    const clientSecret = customClientSecret || abdmConfig.clientSecret;

    if (!clientId || !clientSecret) {
      throw new AppError({
        message: 'ABDM credentials missing. Set ABDM_CLIENT_ID and ABDM_CLIENT_SECRET in environment.',
        code: ErrorCodes.ABDM_AUTH_ERROR,
        statusCode: 500,
      });
    }

    try {
      logger.info('Authenticating with ABDM Gateway V3 Sessions API...', {
        gatewayUrl: abdmConfig.gatewayBaseUrl,
        cmId: abdmConfig.cmId,
        clientIdPrefix: clientId.slice(0, 6) + '***',
      });

      const response = await this.httpClient.post<ABDMSessionResponse>(
        ABDM_ENDPOINTS.GATEWAY_SESSIONS,
        {
          clientId,
          clientSecret,
          grantType: 'client_credentials',
        },
        {
          headers: {
            'X-CM-ID': abdmConfig.cmId,
          },
        }
      );

      const session = response.data;
      if (!session || !session.accessToken) {
        throw new AppError({
          message: 'Malformed response received from ABDM Gateway session API',
          code: ErrorCodes.ABDM_AUTH_ERROR,
          statusCode: 502,
          details: session,
        });
      }

      this.cachedAccessToken = session.accessToken;
      this.cachedRefreshToken = session.refreshToken || null;
      // Convert expiresIn (seconds) to absolute millisecond timestamp
      const expiresInSec = session.expiresIn || 1200;
      this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
      this.saveTokenToDisk(session, this.tokenExpiresAt);

      logger.info('ABDM session token acquired successfully.', {
        expiresInSeconds: expiresInSec,
        expiresAt: new Date(this.tokenExpiresAt).toISOString(),
      });

      // Save token to database asynchronously (non-blocking)
      this.saveTokenToDb(session).catch((dbErr) => {
        logger.warn('Failed to persist ABDM token to database:', { error: dbErr.message });
      });

      return session.accessToken;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('ABDM Gateway authentication failed', {
        errorMessage: error.message,
      });

      throw new AppError({
        message: error.message || 'ABDM Gateway authentication failed',
        code: ErrorCodes.ABDM_AUTH_ERROR,
        statusCode: error.response?.status || 500,
        originalAbdmCode: error.response?.data?.code,
        details: error.response?.data,
      });
    }
  }

  /**
   * Persist token in database for audit and lifecycle tracking
   */
  private async saveTokenToDb(session: ABDMSessionResponse): Promise<void> {
    try {
      await prisma.aBDMToken.create({
        data: {
          tokenType: session.tokenType || 'bearer',
          accessToken: session.accessToken,
          refreshToken: session.refreshToken || null,
          expiresIn: session.expiresIn || 1200,
          expiresAt: new Date(Date.now() + (session.expiresIn || 1200) * 1000),
          isActive: true,
        },
      });
    } catch {
      // Ignored if DB is disconnected in mock or test run
    }
  }
}

export const abdmAuthService = new ABDMAuthService();
