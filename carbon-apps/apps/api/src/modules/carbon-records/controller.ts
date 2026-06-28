import { FastifyRequest, FastifyReply } from 'fastify';
import { carbonRecordService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError, ForbiddenError } from '../../common/errors/custom-errors.js';
import { prisma } from '../../common/database/prisma.js';

export class CarbonRecordController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const sortBy = query.sortBy || 'year';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    let departmentId = query.departmentId || undefined;
    let organizationId = query.organizationId || undefined;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const month = query.month ? parseInt(query.month, 10) : undefined;
    const status = query.status || undefined;

    // Role-based scoping
    const caller = request.user;
    if (caller) {
      if (!caller.roles.includes('SuperAdmin')) {
        if (caller.roles.includes('Admin')) {
          organizationId = caller.organizationId ?? 'undefined';
        } else {
          // Regular User
          departmentId = caller.departmentId ?? 'undefined';
          organizationId = undefined;
        }
      }
    }

    const result = await carbonRecordService.list({
      page, limit, sortBy, sortOrder,
      departmentId, organizationId, year, month, status
    });
    return reply.send(buildApiResponse({
      success: true,
      message: 'Carbon records retrieved',
      data: result.items,
      meta: result.meta
    }));
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Record ID is required');
    const record = await carbonRecordService.findById(id);

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        if (record.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('You do not have permission to access this record');
        }
      } else {
        if (record.departmentId !== caller.departmentId) {
          throw new ForbiddenError('You do not have permission to access this record');
        }
      }
    }

    return reply.send(buildApiResponse({ success: true, message: 'Carbon record retrieved', data: record }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.departmentId || !data.year || !data.month) {
      throw new BadRequestError('departmentId, year, and month are required');
    }

    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        // Verify target department belongs to Admin's organization
        const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
        if (!dept || dept.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot create record for a department outside your organization');
        }
      } else {
        // Force/Verify Regular User creates for their own department
        if (data.departmentId !== caller.departmentId) {
          throw new ForbiddenError('Cannot create record for a department other than your own');
        }
      }
    }

    const record = await carbonRecordService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'Carbon record created', data: record }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('Record ID is required');

    // Fetch existing first to check permissions
    const existing = await carbonRecordService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        if (existing.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot update record outside your organization');
        }
        if (data.departmentId && data.departmentId !== existing.departmentId) {
          const newDept = await prisma.department.findUnique({ where: { id: data.departmentId } });
          if (!newDept || newDept.organizationId !== caller.organizationId) {
            throw new ForbiddenError('Cannot change department to one outside your organization');
          }
        }
      } else {
        if (existing.departmentId !== caller.departmentId) {
          throw new ForbiddenError('Cannot update record outside your department');
        }
        if (data.departmentId && data.departmentId !== existing.departmentId) {
          throw new ForbiddenError('Cannot change department of this record');
        }
      }
    }

    const record = await carbonRecordService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'Carbon record updated', data: record }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Record ID is required');

    const existing = await carbonRecordService.findById(id);
    const caller = request.user;
    if (caller && !caller.roles.includes('SuperAdmin')) {
      if (caller.roles.includes('Admin')) {
        if (existing.department?.organizationId !== caller.organizationId) {
          throw new ForbiddenError('Cannot delete record outside your organization');
        }
      } else {
        if (existing.departmentId !== caller.departmentId) {
          throw new ForbiddenError('Cannot delete record outside your department');
        }
      }
    }

    await carbonRecordService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'Carbon record deleted' }));
  }
}

export const carbonRecordController = new CarbonRecordController();
