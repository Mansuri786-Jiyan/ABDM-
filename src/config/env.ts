import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/abdm_connector?schema=public'),
  JWT_SECRET: z.string().default('super_secret_jwt_key_abdm_connector_2026'),

  ABDM_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ABDM_CLIENT_ID: z.string().default(''),
  ABDM_CLIENT_SECRET: z.string().default(''),
  ABDM_GATEWAY_BASE_URL: z.string().default('https://dev.abdm.gov.in/api/hiecm'),
  ABDM_ABHA_BASE_URL: z.string().default('https://abhasbx.abdm.gov.in/abha/api/v3'),
  ABDM_CM_ID: z.string().default('sbx'),

  LOG_LEVEL: z.string().default('info'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Environment validation failed:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
