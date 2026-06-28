import { FastifyRequest, FastifyReply } from 'fastify';
import { emissionFactorService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { BadRequestError } from '../../common/errors/custom-errors.js';

export class EmissionFactorController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const factors = await emissionFactorService.list(year);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors retrieved successfully',
      data: factors
    }));
  }

  async bulkUpdate(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;
    const factors = body.factors;

    if (!year || !Array.isArray(factors)) {
      throw new BadRequestError('year and factors array are required');
    }

    await emissionFactorService.bulkUpdate(year, factors, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors updated successfully'
    }));
  }

  async clone(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const fromYear = body.fromYear ? parseInt(body.fromYear, 10) : undefined;
    const toYear = body.toYear ? parseInt(body.toYear, 10) : undefined;

    if (!fromYear || !toYear) {
      throw new BadRequestError('fromYear and toYear are required');
    }

    await emissionFactorService.clone(fromYear, toYear, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors cloned successfully'
    }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;
    const { category, key, name, value, unit } = body;

    if (!year || !category || !key || !name || value === undefined || !unit) {
      throw new BadRequestError('year, category, key, name, value, and unit are required');
    }

    const factor = await emissionFactorService.create({
      year,
      category,
      key,
      name,
      value: parseFloat(value),
      unit
    }, userId);

    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factor created successfully',
      data: factor
    }));
  }

  async initialize(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;

    if (!year) {
      throw new BadRequestError('year is required');
    }

    await emissionFactorService.initialize(year, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors initialized successfully'
    }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : undefined;

    if (!year) {
      throw new BadRequestError('year is required');
    }

    await emissionFactorService.deleteByYear(year, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors for the year deleted successfully'
    }));
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const factor = await emissionFactorService.getById(id);
    if (!factor) throw new BadRequestError('Not found');
    return reply.send(buildApiResponse({ success: true, message: 'OK', data: factor }));
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const factor = await emissionFactorService.update(id, {
      name: body.name,
      value: body.value !== undefined ? parseFloat(body.value) : undefined,
      unit: body.unit,
      source: body.source ?? null,
      sourceUrl: body.sourceUrl ?? null
    }, userId);
    return reply.send(buildApiResponse({ success: true, message: 'Updated successfully', data: factor }));
  }
}

export const emissionFactorController = new EmissionFactorController();

