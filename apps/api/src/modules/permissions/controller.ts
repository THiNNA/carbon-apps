import { FastifyRequest, FastifyReply } from 'fastify';
import { permissionService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class PermissionController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const result = await permissionService.list({
      page,
      limit,
      search,
      sortBy,
      sortOrder
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Permissions retrieved successfully',
        data: result.items,
        meta: result.meta
      })
    );
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) {
      throw new BadRequestError('Permission ID is required');
    }

    const perm = await permissionService.findById(id);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Permission details retrieved successfully',
        data: perm
      })
    );
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;

    if (!data.name) {
      throw new BadRequestError('Permission name is required');
    }

    const created = await permissionService.create(data, creatorId);
    return reply.status(201).send(
      buildApiResponse({
        success: true,
        message: 'Permission created successfully',
        data: created
      })
    );
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;

    if (!id) {
      throw new BadRequestError('Permission ID is required');
    }

    const updated = await permissionService.update(id, data, updaterId);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Permission updated successfully',
        data: updated
      })
    );
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;

    if (!id) {
      throw new BadRequestError('Permission ID is required');
    }

    await permissionService.delete(id);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Permission deleted successfully'
      })
    );
  }
}
export const permissionController = new PermissionController();
