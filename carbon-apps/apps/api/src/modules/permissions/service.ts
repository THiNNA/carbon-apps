import { permissionRepository } from './repository.js';
import { CreatePermissionDto, UpdatePermissionDto, PermissionDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';

export class PermissionService {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { items, total } = await permissionRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);

    const permissionDtos: PermissionDto[] = items.map((perm) => ({
      id: perm.id,
      name: perm.name,
      description: perm.description,
      createdAt: perm.createdAt,
      updatedAt: perm.updatedAt,
      deletedAt: perm.deletedAt,
      createdBy: perm.createdBy,
      updatedBy: perm.updatedBy,
      deletedBy: perm.deletedBy
    }));

    return {
      items: permissionDtos,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages
      }
    };
  }

  async findById(id: string): Promise<PermissionDto> {
    const perm = await permissionRepository.findById(id);
    if (!perm) {
      throw new NotFoundError('Permission not found');
    }

    return {
      id: perm.id,
      name: perm.name,
      description: perm.description,
      createdAt: perm.createdAt,
      updatedAt: perm.updatedAt,
      deletedAt: perm.deletedAt,
      createdBy: perm.createdBy,
      updatedBy: perm.updatedBy,
      deletedBy: perm.deletedBy
    };
  }

  async create(data: CreatePermissionDto, creatorId?: string): Promise<PermissionDto> {
    const existing = await permissionRepository.findByName(data.name);
    if (existing) {
      throw new BadRequestError('Permission name already exists');
    }

    const perm = await permissionRepository.create(data, creatorId);
    return {
      id: perm.id,
      name: perm.name,
      description: perm.description,
      createdAt: perm.createdAt,
      updatedAt: perm.updatedAt,
      deletedAt: perm.deletedAt,
      createdBy: perm.createdBy,
      updatedBy: perm.updatedBy,
      deletedBy: perm.deletedBy
    };
  }

  async update(id: string, data: UpdatePermissionDto, updaterId?: string): Promise<PermissionDto> {
    const perm = await permissionRepository.findById(id);
    if (!perm) {
      throw new NotFoundError('Permission not found');
    }

    if (data.name && data.name !== perm.name) {
      const existing = await permissionRepository.findByName(data.name);
      if (existing) {
        throw new BadRequestError('Permission name already exists');
      }
    }

    const updated = await permissionRepository.update(id, data, updaterId);
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      deletedAt: updated.deletedAt,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
      deletedBy: updated.deletedBy
    };
  }

  async delete(id: string) {
    const perm = await permissionRepository.findById(id);
    if (!perm) {
      throw new NotFoundError('Permission not found');
    }
    return permissionRepository.delete(id);
  }
}
export const permissionService = new PermissionService();
