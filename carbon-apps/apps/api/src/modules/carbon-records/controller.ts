import { FastifyRequest, FastifyReply } from 'fastify';
import { carbonRecordService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class CarbonRecordController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const sortBy = query.sortBy || 'year';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const departmentId = query.departmentId || undefined;
    const organizationId = query.organizationId || undefined;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const month = query.month ? parseInt(query.month, 10) : undefined;
    const status = query.status || undefined;

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
    return reply.send(buildApiResponse({ success: true, message: 'Carbon record retrieved', data: record }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const creatorId = request.user?.userId;
    const data = request.body as any;
    if (!data.departmentId || !data.year || !data.month) {
      throw new BadRequestError('departmentId, year, and month are required');
    }
    const record = await carbonRecordService.create(data, creatorId);
    return reply.status(201).send(buildApiResponse({ success: true, message: 'Carbon record created', data: record }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('Record ID is required');
    const record = await carbonRecordService.update(id, data, updaterId);
    return reply.send(buildApiResponse({ success: true, message: 'Carbon record updated', data: record }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Record ID is required');
    await carbonRecordService.delete(id);
    return reply.send(buildApiResponse({ success: true, message: 'Carbon record deleted' }));
  }
}

export const carbonRecordController = new CarbonRecordController();
