import { FastifyRequest, FastifyReply } from 'fastify';
import { emissionFactorService } from './service.js';
import { buildApiResponse } from '@enterprise/shared-utils';
import { BadRequestError, ForbiddenError } from '../../common/errors/custom-errors.js';

export class EmissionFactorController {
  async groups(request: FastifyRequest, reply: FastifyReply) {
    const groups = await emissionFactorService.listGroups();
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factor groups retrieved successfully',
      data: groups
    }));
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const organizationId = query.organizationId as string | undefined;
    const factors = await emissionFactorService.list(year, organizationId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors retrieved successfully',
      data: factors
    }));
  }

  async bulkUpdate(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const isSuperAdmin = request.user?.roles?.includes('SuperAdmin') ?? false;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;
    const organizationId = body.organizationId as string;
    const factors = body.factors;

    if (!year || !organizationId || !Array.isArray(factors)) {
      throw new BadRequestError('year, organizationId and factors array are required');
    }

    // Check if target is system org — only SuperAdmin can modify
    const systemOrgId = await emissionFactorService.getSystemOrgId();
    if (systemOrgId && organizationId === systemOrgId && !isSuperAdmin) {
      throw new ForbiddenError('เฉพาะ SuperAdmin เท่านั้นที่สามารถแก้ไขค่ามาตรฐานเริ่มต้นของระบบได้');
    }

    await emissionFactorService.bulkUpdate(year, organizationId, factors, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors updated successfully'
    }));
  }

  async clone(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const fromYear = body.fromYear ? parseInt(body.fromYear, 10) : undefined;
    const fromOrgId = body.fromOrgId as string;
    const toYear = body.toYear ? parseInt(body.toYear, 10) : undefined;
    const toOrgId = body.toOrgId as string;

    if (!fromYear || !fromOrgId || !toYear || !toOrgId) {
      throw new BadRequestError('fromYear, fromOrgId, toYear, and toOrgId are required');
    }

    await emissionFactorService.clone(fromYear, fromOrgId, toYear, toOrgId, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors cloned successfully'
    }));
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const isSuperAdmin = request.user?.roles?.includes('SuperAdmin') ?? false;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;
    const { category, key, name, value, unit, organizationId } = body;

    if (!year || !category || !key || !name || value === undefined || !unit || !organizationId) {
      throw new BadRequestError('year, category, key, name, value, unit, and organizationId are required');
    }

    // Check if target is system org
    const systemOrgId = await emissionFactorService.getSystemOrgId();
    if (systemOrgId && organizationId === systemOrgId && !isSuperAdmin) {
      throw new ForbiddenError('เฉพาะ SuperAdmin เท่านั้นที่สามารถแก้ไขค่ามาตรฐานเริ่มต้นของระบบได้');
    }

    const factor = await emissionFactorService.create({
      year,
      category,
      key,
      name,
      value: parseFloat(value),
      unit,
      organizationId
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
    const organizationId = body.organizationId as string;

    if (!year || !organizationId) {
      throw new BadRequestError('year and organizationId are required');
    }

    await emissionFactorService.initialize(year, organizationId, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors initialized successfully'
    }));
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const isSuperAdmin = request.user?.roles?.includes('SuperAdmin') ?? false;
    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const organizationId = query.organizationId as string | undefined;

    if (!year || !organizationId) {
      throw new BadRequestError('year and organizationId are required');
    }

    // Prevent non-SuperAdmin from deleting system org entries
    const systemOrgId = await emissionFactorService.getSystemOrgId();
    if (systemOrgId && organizationId === systemOrgId && !isSuperAdmin) {
      throw new ForbiddenError('เฉพาะ SuperAdmin เท่านั้นที่สามารถลบค่ามาตรฐานเริ่มต้นของระบบได้');
    }

    await emissionFactorService.deleteByYearAndOrg(year, organizationId, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: 'Emission factors for the year and organization deleted successfully'
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
    const isSuperAdmin = request.user?.roles?.includes('SuperAdmin') ?? false;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    // Check if updating system org entry
    const existing = await emissionFactorService.getById(id);
    if (existing) {
      const systemOrgId = await emissionFactorService.getSystemOrgId();
      if (systemOrgId && existing.organizationId === systemOrgId && !isSuperAdmin) {
        throw new ForbiddenError('เฉพาะ SuperAdmin เท่านั้นที่สามารถแก้ไขค่ามาตรฐานเริ่มต้นของระบบได้');
      }
    }

    const factor = await emissionFactorService.update(id, {
      name: body.name,
      value: body.value !== undefined ? parseFloat(body.value) : undefined,
      unit: body.unit,
      source: body.source ?? null,
      sourceUrl: body.sourceUrl ?? null
    }, userId);
    return reply.send(buildApiResponse({ success: true, message: 'Updated successfully', data: factor }));
  }

  // ─── System Defaults Endpoints ─────────────────────────────────────────
  async listSystemDefaults(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as any;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const factors = await emissionFactorService.listSystemDefaults(year);
    return reply.send(buildApiResponse({
      success: true,
      message: 'System default emission factors retrieved successfully',
      data: factors
    }));
  }

  async initializeSystemDefaults(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    const body = request.body as any;
    const year = body.year ? parseInt(body.year, 10) : undefined;

    if (!year) {
      throw new BadRequestError('year is required');
    }

    await emissionFactorService.initializeSystemDefaults(year, userId);
    return reply.send(buildApiResponse({
      success: true,
      message: `System default emission factors initialized for year ${year}`
    }));
  }
}

export const emissionFactorController = new EmissionFactorController();
