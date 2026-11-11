import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/abdm_connector?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_123';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, './src/config'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@integrations': path.resolve(__dirname, './src/integrations'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@database': path.resolve(__dirname, './src/database'),
    },
  },
});
