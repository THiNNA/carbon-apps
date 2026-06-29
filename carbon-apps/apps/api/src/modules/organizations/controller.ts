import { FastifyRequest, FastifyReply } from 'fastify';
import { organizationService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class OrganizationController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const includeSystem = query.includeSystem === 'true';

    const result = await organizationService.list({ page, limit, search, sortBy, sortOrder, includeSystem });
    return reply.send(buildApiResponse({ success: true, message: 'Organizations retrieved', data: result.items, meta: result.meta }));
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Organization ID is required');
    const org = await organizationService.findById(id);
    return reply.send(buildApiResponse({ success: true, message: 'Organization retrieved', data: org }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.code || !data.name) throw new BadRequestError('Code and Name are required');
    const org = await organizationService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'Organization created', data: org }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('Organization ID is required');
    const org = await organizationService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'Organization updated', data: org }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Organization ID is required');
    await organizationService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'Organization deleted' }));
  }
}

export const organizationController = new OrganizationController();
