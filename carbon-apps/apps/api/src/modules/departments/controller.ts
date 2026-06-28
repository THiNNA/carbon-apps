import { FastifyRequest, FastifyReply } from 'fastify';
import { departmentService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError, ForbiddenError } from '../../common/errors/custom-errors.js';

export class DepartmentController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    let organizationId = query.organizationId || undefined;

    // Role-based scoping
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      organizationId = caller.organizationId ?? 'undefined';
    }

    const result = await departmentService.list({ page, limit, search, sortBy, sortOrder, organizationId });
    return reply.send(buildApiResponse({ success: true, message: 'Departments retrieved', data: result.items, meta: result.meta }));
  }

  async listAll(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    let organizationId = query.organizationId || undefined;

    // Role-based scoping
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      organizationId = caller.organizationId ?? 'undefined';
    }

    const items = await departmentService.listAll(organizationId);
    return reply.send(buildApiResponse({ success: true, message: 'All departments retrieved', data: items }));
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Department ID is required');
    const dept = await departmentService.findById(id);

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (dept.organizationId !== caller.organizationId) {
        throw new ForbiddenError('You do not have permission to access this department');
      }
    }

    return reply.send(buildApiResponse({ success: true, message: 'Department retrieved', data: dept }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.code || !data.name || !data.organizationId) throw new BadRequestError('Code, Name, and Organization are required');

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (data.organizationId !== caller.organizationId) {
        throw new ForbiddenError('Cannot create department for another organization');
      }
    }

    const dept = await departmentService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'Department created', data: dept }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('Department ID is required');

    const existing = await departmentService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (existing.organizationId !== caller.organizationId) {
        throw new ForbiddenError('Cannot update department outside your organization');
      }
      if (data.organizationId && data.organizationId !== existing.organizationId) {
        throw new ForbiddenError('Cannot change organization of this department');
      }
    }

    const dept = await departmentService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'Department updated', data: dept }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Department ID is required');

    const existing = await departmentService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (existing.organizationId !== caller.organizationId) {
        throw new ForbiddenError('Cannot delete department outside your organization');
      }
    }

    await departmentService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'Department deleted' }));
  }
}

export const departmentController = new DepartmentController();
