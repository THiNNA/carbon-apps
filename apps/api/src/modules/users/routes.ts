import { FastifyInstance } from 'fastify';
import { userController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function userRoutes(app: FastifyInstance) {
  // All endpoints in this module are protected by default
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('users:read')] }, userController.list.bind(userController));
  app.get('/:id', { preHandler: [requirePermission('users:read')] }, userController.getDetail.bind(userController));
  app.post('/', { preHandler: [requirePermission('users:create')] }, userController.create.bind(userController));
  app.put('/:id', { preHandler: [requirePermission('users:update')] }, userController.update.bind(userController));
  app.delete('/:id', { preHandler: [requirePermission('users:delete')] }, userController.delete.bind(userController));
}
