import { FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError, ForbiddenError } from '../../common/errors/custom-errors.js';
import { prisma } from '../../common/database/prisma.js';

export class UserController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Scope based on caller role
    const caller = request.user!;
    const isSuperAdmin = caller.roles.includes('SuperAdmin');
    const isAdmin = caller.roles.includes('Admin');

    let organizationId: string | undefined;
    let departmentId: string | undefined;

    if (!isSuperAdmin && isAdmin) {
      organizationId = caller.organizationId ?? undefined;
    } else if (!isSuperAdmin && !isAdmin) {
      departmentId = caller.departmentId ?? undefined;
    }

    const result = await userService.list({
      page, limit, search, sortBy, sortOrder,
      organizationId, departmentId,
      excludeId: caller.userId
    });
    return reply.send(buildApiResponse({ success: true, message: 'Users retrieved successfully', data: result.items, meta: result.meta }));
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('User ID is required');
    const user = await userService.findById(id);

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        if (user.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('You do not have permission to view this user');
        }
      } else {
        if (user.id !== caller.userId) {
          throw new ForbiddenError('You do not have permission to view this user');
        }
      }
    }

    return reply.send(buildApiResponse({ success: true, message: 'User details retrieved successfully', data: user }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.email || !data.name) throw new BadRequestError('Email and Name are required');

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (data.roleId) {
        const role = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (role && role.name === 'SuperAdmin') {
          throw new ForbiddenError('Cannot assign SuperAdmin role');
        }
      }

      if (caller.roles.includes('Admin')) {
        if (!data.departmentId) throw new BadRequestError('Department ID is required');
        const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
        if (!dept || dept.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot create user for a department outside your organization');
        }
      } else {
        throw new ForbiddenError('Regular users cannot create users');
      }
    }

    const created = await userService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'User created successfully', data: created }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('User ID is required');

    const existing = await userService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (data.roleId) {
        const role = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (role && role.name === 'SuperAdmin') {
          throw new ForbiddenError('Cannot assign SuperAdmin role');
        }
      }

      if (caller.roles.includes('Admin')) {
        if (existing.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot update user outside your organization');
        }
        if (data.departmentId) {
          const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
          if (!dept || dept.organizationId !== caller.organizationId) {
            throw new ForbiddenError('Cannot move user to a department outside your organization');
          }
        }
      } else {
        if (id !== caller.userId) {
          throw new ForbiddenError('Cannot update another user profile');
        }
      }
    }

    const updated = await userService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'User updated successfully', data: updated }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('User ID is required');

    const existing = await userService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        if (existing.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot delete user outside your organization');
        }
      } else {
        throw new ForbiddenError('Regular users cannot delete users');
      }
    }

    await userService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'User deleted successfully' }));
  }
}
export const userController = new UserController();
