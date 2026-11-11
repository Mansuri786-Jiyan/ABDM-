import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../database/prisma';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const hospitalId = req.client?.hospitalId;
    const clientId = req.client?.clientId;

    logger.info(`HTTP ${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms`, {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      durationMs: duration,
      ip: req.ip,
      hospitalId,
      clientId,
    });

    // Asynchronously record audit log in database
    if (req.originalUrl.startsWith('/api/v1/')) {
      prisma.auditLog
        .create({
          data: {
            hospitalId: hospitalId || null,
            clientId: clientId || null,
            endpoint: req.originalUrl,
            method: req.method,
            statusCode,
            requestIp: req.ip || null,
            userAgent: req.get('user-agent') || null,
            executionTimeMs: duration,
            transactionId: (req.body && req.body.transactionId) || null,
          },
        })
        .catch(() => {
          // Ignore DB logging errors to not block response
        });
    }
  });

  next();
}
