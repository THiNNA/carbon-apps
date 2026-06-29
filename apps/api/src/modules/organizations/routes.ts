import { FastifyInstance } from 'fastify';
import { organizationController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('organizations:read')] }, organizationController.list.bind(organizationController));
  app.get('/:id', { preHandler: [requirePermission('organizations:read')] }, organizationController.getDetail.bind(organizationController));
  app.post('/', { preHandler: [requirePermission('organizations:create')] }, organizationController.create.bind(organizationController));
  app.put('/:id', { preHandler: [requirePermission('organizations:update')] }, organizationController.update.bind(organizationController));
  app.delete('/:id', { preHandler: [requirePermission('organizations:delete')] }, organizationController.delete.bind(organizationController));
}
