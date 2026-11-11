import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();

  // Try establishing database connection
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`=======================================================`);
    logger.info(` ABDM M1 Connector Backend Service running on port ${env.PORT}`);
    logger.info(` Mode: ${env.NODE_ENV} | ABDM Target: ${env.ABDM_ENV.toUpperCase()}`);
    logger.info(` API Documentation: http://localhost:${env.PORT}/api-docs`);
    logger.info(` Healthcheck:       http://localhost:${env.PORT}/health`);
    logger.info(`=======================================================`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shutdown complete.');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start ABDM connector server', { error: err.message, stack: err.stack });
  process.exit(1);
});
