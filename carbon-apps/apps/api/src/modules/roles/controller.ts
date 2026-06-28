import { FastifyRequest, FastifyReply } from 'fastify';
import { roleService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

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

    const updated = await roleService.update(id, data, updaterId);
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

    await roleService.delete(id);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Role deleted successfully'
      })
    );
  }
}
export const roleController = new RoleController();
