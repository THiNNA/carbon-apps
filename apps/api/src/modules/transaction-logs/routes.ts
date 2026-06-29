import { FastifyInstance } from 'fastify';
import { transactionLogController } from './controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';

export async function transactionLogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // เฉพาะ SuperAdmin เท่านั้นที่สามารถดู Transaction Logs ได้
  app.get('/', { preHandler: [requireRole('SuperAdmin')] }, transactionLogController.list.bind(transactionLogController));
  app.get('/:id', { preHandler: [requireRole('SuperAdmin')] }, transactionLogController.getDetail.bind(transactionLogController));
}
