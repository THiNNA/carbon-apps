import { FastifyInstance } from 'fastify';
import { authController } from './controller.js';
import { authenticate } from '../../common/middleware/auth.js';

export async function authRoutes(app: FastifyInstance) {
  // Public routes
  app.post('/login', authController.login.bind(authController));
  app.post('/refresh', authController.refresh.bind(authController));

  // Protected routes
  app.post('/logout', { preHandler: [authenticate] }, authController.logout.bind(authController));
  app.get('/me', { preHandler: [authenticate] }, authController.getProfile.bind(authController));
  app.put('/profile', { preHandler: [authenticate] }, authController.updateProfile.bind(authController));
  app.put('/settings', { preHandler: [authenticate] }, authController.updateSettings.bind(authController));
}
