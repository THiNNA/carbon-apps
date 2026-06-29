import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';

export const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});
