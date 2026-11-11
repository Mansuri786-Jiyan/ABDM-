import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/swagger';
import { authRouter } from './modules/auth/auth.routes';
import { abhaRouter } from './modules/abha/abha.routes';
import { hospitalRouter } from './modules/hospital/hospital.routes';
import { hospitalScanShareRouter, abdmCallbackRouter } from './modules/scan-share/scan-share.routes';
import { hospitalHipLinkingRouter, abdmHipWebhookRouter } from './modules/hip-linking/hip-linking.routes';
import { hospitalHiuRouter, abdmHiuWebhookRouter } from './modules/hiu/hiu.routes';
import { phrRouter } from './modules/phr/phr.routes';
import { hprRouter, hfrRouter } from './modules/hpr-hfr/hpr-hfr.routes';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { abdmConfig } from './config/abdm.config';
import { prisma } from './database/prisma';

export function createApp(): Application {
  const app: Application = express();

  // Security Middleware
  app.use(helmet({ contentSecurityPolicy: false })); // allow swagger ui inline styles
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Global Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please slow down.',
    },
  });
  app.use(globalLimiter);

  // Request Logging & Tracing
  app.use(requestLogger);

  // Swagger Documentation UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ABDM M1 Connector API Docs',
  }));
  app.get('/docs', (req: Request, res: Response) => res.redirect('/api-docs'));



  // Healthcheck Endpoint
  app.get('/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'abdm-m1-connector',
      environment: abdmConfig.env,
      database: dbStatus,
      abdmGatewayUrl: abdmConfig.gatewayBaseUrl,
      abdmAbhaUrl: abdmConfig.abhaBaseUrl,
      cmId: abdmConfig.cmId,
      credentialsConfigured: !!(abdmConfig.clientId && abdmConfig.clientSecret),
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/abha', abhaRouter);
  app.use('/api/v1/hospitals', hospitalRouter);
  app.use('/api/v1/scan-share', hospitalScanShareRouter);
  app.use('/api/v1/hip', hospitalHipLinkingRouter);
  app.use('/api/v1/hiu', hospitalHiuRouter);
  app.use('/api/v1/phr', phrRouter);
  app.use('/api/v1/hpr', hprRouter);
  app.use('/api/v1/hfr', hfrRouter);

  // Official ABDM Incoming Webhook Routes
  app.use(abdmCallbackRouter);
  app.use(abdmHipWebhookRouter);
  app.use(abdmHiuWebhookRouter);

  // 404 Handler for undefined routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
