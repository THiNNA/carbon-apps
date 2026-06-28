import { FastifyInstance } from 'fastify';
import { carbonRecordController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function carbonRecordRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('carbon-records:read')] }, carbonRecordController.list.bind(carbonRecordController));
  app.get('/:id', { preHandler: [requirePermission('carbon-records:read')] }, carbonRecordController.getDetail.bind(carbonRecordController));
  app.post('/', { preHandler: [requirePermission('carbon-records:create')] }, carbonRecordController.create.bind(carbonRecordController));
  app.put('/:id', { preHandler: [requirePermission('carbon-records:update')] }, carbonRecordController.update.bind(carbonRecordController));
  app.delete('/:id', { preHandler: [requirePermission('carbon-records:delete')] }, carbonRecordController.delete.bind(carbonRecordController));
}
