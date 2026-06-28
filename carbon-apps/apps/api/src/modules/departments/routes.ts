import { FastifyInstance } from 'fastify';
import { departmentController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function departmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [requirePermission('departments:read')] }, departmentController.list.bind(departmentController));
  app.get('/all', { preHandler: [requirePermission('departments:read')] }, departmentController.listAll.bind(departmentController));
  app.get('/:id', { preHandler: [requirePermission('departments:read')] }, departmentController.getDetail.bind(departmentController));
  app.post('/', { preHandler: [requirePermission('departments:create')] }, departmentController.create.bind(departmentController));
  app.put('/:id', { preHandler: [requirePermission('departments:update')] }, departmentController.update.bind(departmentController));
  app.delete('/:id', { preHandler: [requirePermission('departments:delete')] }, departmentController.delete.bind(departmentController));
}
