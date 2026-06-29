import { FastifyRequest, FastifyReply } from 'fastify';
import { roleService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';
import { transactionLogService } from '../transaction-logs/service.js';

export class RoleController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const result = await roleService.list({
      page,
      limit,
      search,
      sortBy,
      sortOrder
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Roles retrieved successfully',
        data: result.items,
        meta: result.meta
      })
    );
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) {
      throw new BadRequestError('Role ID is required');
    }

    const role = await roleService.findById(id);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Role details retrieved successfully',
        data: role
      })
    );
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;

    if (!data.name) {
      throw new BadRequestError('Role name is required');
    }

    const created = await roleService.create(data, creatorId);

    // บันทึก Log การสร้างบทบาท
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'CREATE',
      module: 'Role',
      targetId: created.id,
      targetName: created.name,
      newValue: JSON.stringify(created),
      requestData: JSON.stringify(data),
      responseData: JSON.stringify(created),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.status(201).send(
      buildApiResponse({
        success: true,
        message: 'Role created successfully',
        data: created
      })
    );
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;

    if (!id) {
      throw new BadRequestError('Role ID is required');
    }

    const existing = await roleService.findById(id);
    const updated = await roleService.update(id, data, updaterId);

    // บันทึก Log การแก้ไขบทบาท
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'UPDATE',
      module: 'Role',
      targetId: id,
      targetName: updated.name,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
      requestData: JSON.stringify({ id, body: data }),
      responseData: JSON.stringify(updated),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Role updated successfully',
        data: updated
      })
    );
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;

    if (!id) {
      throw new BadRequestError('Role ID is required');
    }

    const existing = await roleService.findById(id);
    await roleService.delete(id);

    // บันทึก Log การลบบทบาท
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'DELETE',
      module: 'Role',
      targetId: id,
      targetName: existing.name,
      oldValue: JSON.stringify(existing),
      requestData: JSON.stringify({ id }),
      responseData: JSON.stringify({ success: true, message: 'Role deleted successfully' }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Role deleted successfully'
      })
    );
  }
}

export const roleController = new RoleController();
