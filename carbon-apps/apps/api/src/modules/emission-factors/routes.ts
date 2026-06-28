import { FastifyInstance } from 'fastify';
import { emissionFactorController } from './controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';

export async function emissionFactorRoutes(app: FastifyInstance) {
  // All endpoints in this module are protected and restricted to SuperAdmin
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('SuperAdmin'));

  app.get('/', emissionFactorController.list.bind(emissionFactorController));
  app.get('/:id', emissionFactorController.getById.bind(emissionFactorController));
  app.post('/', emissionFactorController.create.bind(emissionFactorController));
  app.put('/:id', emissionFactorController.update.bind(emissionFactorController));
  app.post('/bulk-update', emissionFactorController.bulkUpdate.bind(emissionFactorController));
  app.post('/clone', emissionFactorController.clone.bind(emissionFactorController));
  app.post('/initialize', emissionFactorController.initialize.bind(emissionFactorController));
  app.delete('/', emissionFactorController.delete.bind(emissionFactorController));
}

