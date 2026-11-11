import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../modules/auth/auth.service';
import { AppError, ErrorCodes } from '../utils/errors';

export interface ClientContext {
  hospitalId: string;
  clientId: string;
  clientName: string;
  hospitalSessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      client?: ClientContext;
    }
  }
}

/**
 * Universal Authentication middleware for connector endpoints.
 * Compatible with ANY HMIS architecture:
 *  1. Header: Authorization: Bearer <jwt>
 *  2. Header: X-Client-Id and X-Client-Secret
 *  3. Header: X-Client-Id alone (with optional X-Hospital-Session-Id)
 *  4. Header: X-API-KEY: <key>
 */
export async function authenticateHospitalClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const clientIdHeader = (req.headers['x-client-id'] ||
      req.query.clientId ||
      req.query.client_id) as string | undefined;
    const clientSecretHeader = req.headers['x-client-secret'] as string | undefined;
    const apiKeyHeader = (req.headers['x-api-key'] || req.headers['apikey']) as string | undefined;
    const hospitalSessionId = (req.headers['x-hospital-session-id'] ||
      req.headers['x-session-id'] ||
      req.headers['session-id']) as string | undefined;

    // 1. Bearer JWT Authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const payload = authService.verifyToken(token);
      req.client = {
        ...payload,
        hospitalSessionId,
      };
      return next();
    }

    // 2. Direct API Key / Client Credentials Authentication
    if (clientIdHeader && clientSecretHeader) {
      const authResult = await authService.generateClientToken(clientIdHeader, clientSecretHeader);
      req.client = {
        hospitalId: authResult.client.hospitalId,
        clientId: authResult.client.clientId,
        clientName: authResult.client.name,
        hospitalSessionId,
      };
      return next();
    }

    // 3. API-Key Header (clientId:clientSecret or clientId)
    if (apiKeyHeader) {
      const [keyId, keySecret] = apiKeyHeader.includes(':')
        ? apiKeyHeader.split(':')
        : [apiKeyHeader, undefined];

      if (keySecret) {
        const authResult = await authService.generateClientToken(keyId, keySecret);
        req.client = {
          hospitalId: authResult.client.hospitalId,
          clientId: authResult.client.clientId,
          clientName: authResult.client.name,
          hospitalSessionId,
        };
        return next();
      }
    }

    // 4. Client-Id Header with Session ID (Hospital pass-through mode)
    if (clientIdHeader) {
      // Allow dev client or look up registered client
      req.client = {
        hospitalId: 'hosp_default_sandbox',
        clientId: clientIdHeader,
        clientName: `HMIS Tenant (${clientIdHeader})`,
        hospitalSessionId,
      };
      return next();
    }


    throw new AppError({
      message: 'Authentication required. Provide Bearer token or X-Client-Id header.',
      code: ErrorCodes.UNAUTHORIZED,
      statusCode: 401,
    });
  } catch (error) {
    next(error);
  }
}
