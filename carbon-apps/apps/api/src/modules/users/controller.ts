import { FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

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

    const result = await userService.list({ page, limit, search, sortBy, sortOrder, organizationId, departmentId });
    return reply.send(buildApiResponse({ success: true, message: 'Users retrieved successfully', data: result.items, meta: result.meta }));
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('User ID is required');
    const user = await userService.findById(id);
    return reply.send(buildApiResponse({ success: true, message: 'User details retrieved successfully', data: user }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.email || !data.name) throw new BadRequestError('Email and Name are required');
    const created = await userService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'User created successfully', data: created }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('User ID is required');
    const updated = await userService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'User updated successfully', data: updated }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('User ID is required');
    await userService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'User deleted successfully' }));
  }
}
export const userController = new UserController();
