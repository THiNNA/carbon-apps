import dotenv from 'dotenv';
import path from 'path';

// Load env from workspace root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-change-in-production-12345!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-change-in-production-12345!',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

if (!config.DATABASE_URL) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set in environment variables.');
}
