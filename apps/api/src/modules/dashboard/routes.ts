import { FastifyInstance } from 'fastify';
import { dashboardController } from './controller.js';
import { authenticate, requirePermission } from '../../common/middleware/auth.js';

export async function dashboardRoutes(app: FastifyInstance) {
  // All endpoints in this module are protected by default
  app.addHook('preHandler', authenticate);

  app.get('/stats', { preHandler: [requirePermission('dashboard:read')] }, dashboardController.getStats.bind(dashboardController));
  app.get('/available-years', { preHandler: [requirePermission('dashboard:read')] }, dashboardController.getAvailableYears.bind(dashboardController));
  app.get('/carbon-stats', { preHandler: [requirePermission('dashboard:read')] }, dashboardController.getCarbonStats.bind(dashboardController));
}
