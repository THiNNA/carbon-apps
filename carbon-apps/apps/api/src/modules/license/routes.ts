import { FastifyInstance } from 'fastify';
import { licenseController } from './controller.js';
import { optionalAuthenticate } from '../../common/middleware/auth.js';

// Custom auth middleware that parses token but does not reject if unauthorized
export async function licenseRoutes(app: FastifyInstance) {
  // Add optionalAuthenticate to capture user details if logged in during activation
  const preHandlers = [];
  if (optionalAuthenticate) {
    preHandlers.push(optionalAuthenticate);
  }

  app.get('/status', licenseController.getStatus.bind(licenseController));
  app.post('/activate', { preHandler: preHandlers }, licenseController.activate.bind(licenseController));
}
