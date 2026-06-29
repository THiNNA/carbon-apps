import { organizationRepository } from './repository.js';
import { OrganizationDto, CreateOrganizationDto, UpdateOrganizationDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';

function toDto(org: any): OrganizationDto {
  return {
    id: org.id,
    code: org.code,
    name: org.name,
    description: org.description,
    address: org.address,
    phone: org.phone,
    _count: org._count,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    deletedAt: org.deletedAt,
    createdBy: org.createdBy,
    updatedBy: org.updatedBy,
    deletedBy: org.deletedBy
  };
}

export class OrganizationService {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeSystem?: boolean;
  }) {
    const { items, total } = await organizationRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);
    return {
      items: items.map(toDto),
      meta: { page: params.page, limit: params.limit, total, totalPages }
    };
  }

  async findById(id: string): Promise<OrganizationDto> {
    const org = await organizationRepository.findById(id);
    if (!org) throw new NotFoundError('Organization not found');
    return toDto(org);
  }

  async create(data: CreateOrganizationDto, creatorId?: string): Promise<OrganizationDto> {
    const existing = await organizationRepository.findByCode(data.code);
    if (existing) throw new BadRequestError(`Organization code "${data.code}" already exists`);
    const org = await organizationRepository.create(data, creatorId);
    return toDto(org);
  }

  async update(id: string, data: UpdateOrganizationDto, updaterId?: string): Promise<OrganizationDto> {
    const org = await organizationRepository.findById(id);
    if (!org) throw new NotFoundError('Organization not found');
    if (data.code && data.code !== org.code) {
      const existing = await organizationRepository.findByCode(data.code, id);
      if (existing) throw new BadRequestError(`Organization code "${data.code}" already exists`);
    }
    const updated = await organizationRepository.update(id, data, updaterId);
    return toDto(updated);
  }

  async delete(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) throw new NotFoundError('Organization not found');
    return organizationRepository.delete(id);
  }
}

export const organizationService = new OrganizationService();
