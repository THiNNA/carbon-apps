import { FastifyInstance } from 'fastify';
import { roleController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function roleRoutes(app: FastifyInstance) {
  // All endpoints in this module are protected by default
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('roles:read')] }, roleController.list.bind(roleController));
  app.get('/:id', { preHandler: [requirePermission('roles:read')] }, roleController.getDetail.bind(roleController));
  app.post('/', { preHandler: [requirePermission('roles:create')] }, roleController.create.bind(roleController));
  app.put('/:id', { preHandler: [requirePermission('roles:update')] }, roleController.update.bind(roleController));
  app.delete('/:id', { preHandler: [requirePermission('roles:delete')] }, roleController.delete.bind(roleController));
}
