import { FastifyRequest, FastifyReply } from 'fastify';
import { organizationService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';
import { transactionLogService } from '../transaction-logs/service.js';

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

    // บันทึก Log การสร้างองค์กร
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'CREATE',
      module: 'Organization',
      targetId: org.id,
      targetName: `${org.name} (${org.code})`,
      newValue: JSON.stringify(org),
      requestData: JSON.stringify(data),
      responseData: JSON.stringify(org),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.status(201).send(buildApiResponse({ success: true, message: 'Organization created', data: org }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const updaterId = request.user?.userId;
    const { id } = request.params as any;
    const data = request.body as any;
    if (!id) throw new BadRequestError('Organization ID is required');
    
    // ดึงค่าเก่าก่อนอัปเดต
    const oldVal = await organizationService.findById(id);
    const org = await organizationService.update(id, data, updaterId);

    // บันทึก Log การแก้ไของค์กร
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'UPDATE',
      module: 'Organization',
      targetId: id,
      targetName: `${org.name} (${org.code})`,
      oldValue: JSON.stringify(oldVal),
      newValue: JSON.stringify(org),
      requestData: JSON.stringify({ id, body: data }),
      responseData: JSON.stringify(org),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send(buildApiResponse({ success: true, message: 'Organization updated', data: org }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Organization ID is required');

    // ดึงค่าเก่าก่อนลบ
    const oldVal = await organizationService.findById(id);
    await organizationService.delete(id);

    // บันทึก Log การลบองค์กร
    await transactionLogService.log({
      userId: request.user?.userId,
      userEmail: request.user?.email,
      userName: request.user?.email,
      action: 'DELETE',
      module: 'Organization',
      targetId: id,
      targetName: `${oldVal.name} (${oldVal.code})`,
      oldValue: JSON.stringify(oldVal),
      requestData: JSON.stringify({ id }),
      responseData: JSON.stringify({ success: true, message: 'Organization deleted' }),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    });

    return reply.send(buildApiResponse({ success: true, message: 'Organization deleted' }));
  }
}


export const organizationController = new OrganizationController();
