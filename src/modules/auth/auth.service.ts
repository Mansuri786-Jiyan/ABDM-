import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { hospitalService, DEV_DEFAULT_CLIENT } from '../hospital/hospital.service';
import { AppError, ErrorCodes } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface TokenPayload {
  hospitalId: string;
  clientId: string;
  clientName: string;
  hospitalSessionId?: string;
}

export class AuthService {
  /**
   * Validate hospital client credentials and issue a connector JWT token
   */
  public async generateClientToken(clientId: string, clientSecret: string): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    client: {
      clientId: string;
      hospitalId: string;
      name: string;
    };
  }> {
    if (!clientId || !clientSecret) {
      throw new AppError({
        message: 'Both clientId and clientSecret are required',
        code: ErrorCodes.VALIDATION_ERROR,
        statusCode: 400,
      });
    }

    // Check development default client shortcut
    if (
      clientId === DEV_DEFAULT_CLIENT.clientId &&
      clientSecret === DEV_DEFAULT_CLIENT.clientSecret
    ) {
      const expiresIn = 24 * 60 * 60; // 24 hours
      const payload: TokenPayload = {
        hospitalId: DEV_DEFAULT_CLIENT.hospitalId,
        clientId: DEV_DEFAULT_CLIENT.clientId,
        clientName: DEV_DEFAULT_CLIENT.hospitalName,
      };

      const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn });

      return {
        accessToken,
        tokenType: 'bearer',
        expiresIn,
        client: {
          clientId: payload.clientId,
          hospitalId: payload.hospitalId,
          name: payload.clientName,
        },
      };
    }

    // Lookup client in database / cache
    const client = await hospitalService.getClientByClientId(clientId);
    if (!client) {
      logger.warn('Authentication failed: client not found', { clientId });
      throw new AppError({
        message: 'Invalid client credentials',
        code: ErrorCodes.INVALID_CLIENT_CREDENTIALS,
        statusCode: 401,
      });
    }

    if (!client.isActive) {
      logger.warn('Authentication failed: client is disabled', { clientId });
      throw new AppError({
        message: 'Connector client is disabled. Contact system administrator.',
        code: ErrorCodes.CLIENT_INACTIVE,
        statusCode: 403,
      });
    }

    const isMatch = await bcrypt.compare(clientSecret, client.clientSecretHash);
    if (!isMatch) {
      logger.warn('Authentication failed: invalid secret', { clientId });
      throw new AppError({
        message: 'Invalid client credentials',
        code: ErrorCodes.INVALID_CLIENT_CREDENTIALS,
        statusCode: 401,
      });
    }

    const expiresIn = 24 * 60 * 60; // 24 hours
    const payload: TokenPayload = {
      hospitalId: client.hospitalId,
      clientId: client.clientId,
      clientName: client.name,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn });

    logger.info('Hospital client authenticated successfully', {
      clientId,
      hospitalId: client.hospitalId,
    });

    return {
      accessToken,
      tokenType: 'bearer',
      expiresIn,
      client: {
        clientId: client.clientId,
        hospitalId: client.hospitalId,
        name: client.name,
      },
    };
  }

  /**
   * Verify and decode a connector JWT token
   */
  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (err: any) {
      throw new AppError({
        message: 'Invalid or expired connector access token',
        code: ErrorCodes.UNAUTHORIZED,
        statusCode: 401,
      });
    }
  }
}

export const authService = new AuthService();
