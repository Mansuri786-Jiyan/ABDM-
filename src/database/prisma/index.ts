import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Attach logging
// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error('Prisma Error:', { message: e.message, target: e.target });
});

// @ts-ignore
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma Warning:', { message: e.message });
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully.');
    return true;
  } catch (error: any) {
    logger.warn('Database connection failed. Ensure PostgreSQL is running on DATABASE_URL.', {
      error: error.message,
    });
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected.');
}
