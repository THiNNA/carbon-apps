import { departmentRepository } from './repository.js';
import { DepartmentDto, CreateDepartmentDto, UpdateDepartmentDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';

function toDto(dept: any): DepartmentDto {
  return {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    description: dept.description,
    organizationId: dept.organizationId,
    organization: dept.organization ? {
      id: dept.organization.id,
      code: dept.organization.code,
      name: dept.organization.name,
      description: dept.organization.description,
      address: dept.organization.address,
      phone: dept.organization.phone,
      createdAt: dept.organization.createdAt,
      updatedAt: dept.organization.updatedAt,
      deletedAt: dept.organization.deletedAt,
      createdBy: dept.organization.createdBy,
      updatedBy: dept.organization.updatedBy,
      deletedBy: dept.organization.deletedBy
    } : null,
    _count: dept._count,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
    deletedAt: dept.deletedAt,
    createdBy: dept.createdBy,
    updatedBy: dept.updatedBy,
    deletedBy: dept.deletedBy
  };
}

export class DepartmentService {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string;
  }) {
    const { items, total } = await departmentRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);
    return {
      items: items.map(toDto),
      meta: { page: params.page, limit: params.limit, total, totalPages }
    };
  }

  async listAll(organizationId?: string) {
    const items = await departmentRepository.listAll(organizationId);
    return items.map(toDto);
  }

  async findById(id: string): Promise<DepartmentDto> {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department not found');
    return toDto(dept);
  }

  async create(data: CreateDepartmentDto, creatorId?: string): Promise<DepartmentDto> {
    const existing = await departmentRepository.findByCodeAndOrg(data.code, data.organizationId);
    if (existing) throw new BadRequestError(`Department code "${data.code}" already exists in this organization`);
    const dept = await departmentRepository.create(data, creatorId);
    return toDto(dept);
  }

  async update(id: string, data: UpdateDepartmentDto, updaterId?: string): Promise<DepartmentDto> {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department not found');
    const orgId = data.organizationId || dept.organizationId;
    if (data.code && data.code !== dept.code) {
      const existing = await departmentRepository.findByCodeAndOrg(data.code, orgId, id);
      if (existing) throw new BadRequestError(`Department code "${data.code}" already exists in this organization`);
    }
    const updated = await departmentRepository.update(id, data, updaterId);
    return toDto(updated);
  }

  async delete(id: string) {
    const dept = await departmentRepository.findById(id);
    if (!dept) throw new NotFoundError('Department not found');

    const userCount = await departmentRepository.countUsers(id);
    if (userCount > 0) {
      throw new BadRequestError(`ไม่สามารถลบหน่วยงาน "${dept.name}" ได้ เนื่องจากยังมีผู้ใช้งานจำนวน ${userCount} คนสังกัดอยู่ในหน่วยงานนี้`);
    }

    return departmentRepository.delete(id);
  }
}

export const departmentService = new DepartmentService();
