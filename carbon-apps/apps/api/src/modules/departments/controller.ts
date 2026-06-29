import { FastifyRequest, FastifyReply } from 'fastify';
import { departmentService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError, ForbiddenError } from '../../common/errors/custom-errors.js';
import { transactionLogService } from '../transaction-logs/service.js';

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

    // บันทึก Log การสร้างหน่วยงาน
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'CREATE',
      module: 'Department',
      targetId: dept.id,
      targetName: `${dept.name} (${dept.code})`,
      newValue: JSON.stringify(dept),
      requestData: JSON.stringify(data),
      responseData: JSON.stringify(dept),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

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

    // บันทึก Log การแก้ไขหน่วยงาน
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'UPDATE',
      module: 'Department',
      targetId: id,
      targetName: `${dept.name} (${dept.code})`,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(dept),
      requestData: JSON.stringify({ id, body: data }),
      responseData: JSON.stringify(dept),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

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

    // บันทึก Log การลบหน่วยงาน
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'DELETE',
      module: 'Department',
      targetId: id,
      targetName: `${existing.name} (${existing.code})`,
      oldValue: JSON.stringify(existing),
      requestData: JSON.stringify({ id }),
      responseData: JSON.stringify({ success: true, message: 'Department deleted' }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send(buildApiResponse({ success: true, message: 'Department deleted' }));
  }
}


export const departmentController = new DepartmentController();
