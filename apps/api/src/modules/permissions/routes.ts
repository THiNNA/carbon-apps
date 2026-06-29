import { FastifyInstance } from 'fastify';
import { permissionController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function permissionRoutes(app: FastifyInstance) {
  // All endpoints in this module are protected by default
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('permissions:read')] }, permissionController.list.bind(permissionController));
  app.get('/:id', { preHandler: [requirePermission('permissions:read')] }, permissionController.getDetail.bind(permissionController));
  app.post('/', { preHandler: [requirePermission('permissions:create')] }, permissionController.create.bind(permissionController));
  app.put('/:id', { preHandler: [requirePermission('permissions:update')] }, permissionController.update.bind(permissionController));
  app.delete('/:id', { preHandler: [requirePermission('permissions:delete')] }, permissionController.delete.bind(permissionController));
}
