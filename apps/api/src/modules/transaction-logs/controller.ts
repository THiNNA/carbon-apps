import { FastifyRequest, FastifyReply } from 'fastify';
import { transactionLogService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from '../../common/constants/index.js';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class TransactionLogController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const page = parseInt(query.page || String(DEFAULT_PAGE), 10);
    const limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10);
    const search = query.search || undefined;
    const module = query.module || undefined;
    const action = query.action || undefined;
    const startDate = query.startDate || undefined;
    const endDate = query.endDate || undefined;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const result = await transactionLogService.list({
      page,
      limit,
      search,
      module,
      action,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Transaction logs retrieved successfully',
        data: result.items,
        meta: result.meta
      })
    );
  }

  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    if (!id) throw new BadRequestError('Transaction log ID is required');
    const log = await transactionLogService.findById(id);
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Transaction log details retrieved successfully',
        data: log
      })
    );
  }
}

export const transactionLogController = new TransactionLogController();
