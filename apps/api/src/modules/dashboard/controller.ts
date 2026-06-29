import { FastifyRequest, FastifyReply } from 'fastify';
import { dashboardService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class DashboardController {
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await dashboardService.getStats();
    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats
      })
    );
  }

  async getAvailableYears(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (!user) throw new BadRequestError('User not authenticated');
    const query = request.query as any;
    const organizationId = query.organizationId || undefined;
    const departmentId = query.departmentId || undefined;
    const years = await dashboardService.getAvailableYears(user, { organizationId, departmentId });
    return reply.send(
      buildApiResponse({ success: true, message: 'Available years retrieved', data: years })
    );
  }

  async getCarbonStats(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (!user) throw new BadRequestError('User not authenticated');

    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : new Date().getFullYear();
    const baseYear = query.baseYear ? parseInt(query.baseYear, 10) : year - 1;
    const organizationId = query.organizationId || undefined;
    const departmentId = query.departmentId || undefined;

    const stats = await dashboardService.getCarbonStats(user, {
      year,
      baseYear,
      organizationId,
      departmentId
    });

    return reply.send(
      buildApiResponse({
        success: true,
        message: 'Carbon dashboard statistics retrieved successfully',
        data: stats
      })
    );
  }
}
export const dashboardController = new DashboardController();

