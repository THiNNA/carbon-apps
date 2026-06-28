import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppError } from './common/errors/custom-errors.js';
import { buildApiResponse } from '@enterprise/shared-utils';

// Import Routes (will be registered soon)
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { roleRoutes } from './modules/roles/routes.js';
import { permissionRoutes } from './modules/permissions/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { organizationRoutes } from './modules/organizations/routes.js';
import { departmentRoutes } from './modules/departments/routes.js';
import { carbonRecordRoutes } from './modules/carbon-records/routes.js';
import { emissionFactorRoutes } from './modules/emission-factors/routes.js';

export function buildApp() {
  const app = fastify({
    logger: process.env.NODE_ENV === 'production' ? true : {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Security Plugins
  app.register(helmet);
  app.register(cors, {
    origin: '*', // Custom configurations should be set in production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute'
  });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    // If it's a Fastify schema validation error
    if (error.validation) {
      const errors = error.validation.map((err) => ({
        field: err.instancePath.replace(/^\//, '') || undefined,
        message: err.message || 'Validation failed'
      }));
      return reply.status(400).send(
        buildApiResponse({
          success: false,
          message: 'Validation Failure',
          errors
        })
      );
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(
        buildApiResponse({
          success: false,
          message: error.message,
          errors: error.errors || []
        })
      );
    }

    // Rate limiter error
    if (error.statusCode === 429) {
      return reply.status(429).send(
        buildApiResponse({
          success: false,
          message: 'Too many requests, please try again later.'
        })
      );
    }

    // Default Internal Server Error
    return reply.status(500).send(
      buildApiResponse({
        success: false,
        message: 'Internal Server Error',
        errors: [{ message: error.message || 'An unexpected error occurred' }]
      })
    );
  });

  // Health check endpoint
  app.get('/', async () => {
    return buildApiResponse({
      success: true,
      message: 'Enterprise Web Admin API is running'
    });
  });

  // Register Module Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(carbonRecordRoutes, { prefix: '/api/v1/carbon-records' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
  app.register(roleRoutes, { prefix: '/api/v1/roles' });
  app.register(permissionRoutes, { prefix: '/api/v1/permissions' });
  app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  app.register(organizationRoutes, { prefix: '/api/v1/organizations' });
  app.register(departmentRoutes, { prefix: '/api/v1/departments' });
  app.register(emissionFactorRoutes, { prefix: '/api/v1/emission-factors' });

  return app;
}
export type App = ReturnType<typeof buildApp>;
