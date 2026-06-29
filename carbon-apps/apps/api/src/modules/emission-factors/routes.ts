import { FastifyInstance } from 'fastify';
import { emissionFactorController } from './controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';

export async function emissionFactorRoutes(app: FastifyInstance) {
  // Access restricted to SuperAdmin and Admin
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('Admin'));

  app.get('/', emissionFactorController.list.bind(emissionFactorController));
  app.get('/groups', emissionFactorController.groups.bind(emissionFactorController));
  app.get('/:id', emissionFactorController.getById.bind(emissionFactorController));
  app.post('/', emissionFactorController.create.bind(emissionFactorController));
  app.put('/:id', emissionFactorController.update.bind(emissionFactorController));
  app.post('/bulk-update', emissionFactorController.bulkUpdate.bind(emissionFactorController));
  app.post('/clone', emissionFactorController.clone.bind(emissionFactorController));
  app.post('/initialize', emissionFactorController.initialize.bind(emissionFactorController));
  app.delete('/', emissionFactorController.delete.bind(emissionFactorController));

  // System defaults: read (Admin+), initialize (SuperAdmin only via controller guard)
  app.get('/system-defaults', emissionFactorController.listSystemDefaults.bind(emissionFactorController));
  app.post('/system-defaults/initialize', emissionFactorController.initializeSystemDefaults.bind(emissionFactorController));
}
