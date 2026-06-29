import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '@enterprise/shared-utils';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/custom-errors.js';
import { TokenPayload } from '@enterprise/shared-types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken<TokenPayload>(token, config.JWT_ACCESS_SECRET);
    request.user = payload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken<TokenPayload>(token, config.JWT_ACCESS_SECRET);
      request.user = payload;
    }
  } catch (error) {
    // Ignore error in optional authentication
  }
}


export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const hasPermission = request.user.permissions.includes(permission) || request.user.roles.includes('SuperAdmin');
    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to access this resource');
    }
  };
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const hasRole = request.user.roles.includes(role) || request.user.roles.includes('SuperAdmin');
    if (!hasRole) {
      throw new ForbiddenError('You do not have the required role to access this resource');
    }
  };
}
