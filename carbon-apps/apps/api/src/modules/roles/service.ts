import { roleRepository } from './repository.js';
import { CreateRoleDto, UpdateRoleDto, RoleDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';

export class RoleService {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { items, total } = await roleRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);

    const roleDtos: RoleDto[] = items.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      deletedBy: role.deletedBy
    }));

    return {
      items: roleDtos,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages
      }
    };
  }

  async findById(id: string): Promise<RoleDto> {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      deletedBy: role.deletedBy
    };
  }

  async create(data: CreateRoleDto, creatorId?: string): Promise<RoleDto> {
    const existing = await roleRepository.findByName(data.name);
    if (existing) {
      throw new BadRequestError('Role name already exists');
    }

    const role = await roleRepository.create(data, creatorId);
    if (!role) {
      throw new BadRequestError('Role creation failed');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      deletedBy: role.deletedBy
    };
  }

  async update(id: string, data: UpdateRoleDto, updaterId?: string): Promise<RoleDto> {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (data.name && data.name !== role.name) {
      const existing = await roleRepository.findByName(data.name);
      if (existing) {
        throw new BadRequestError('Role name already exists');
      }
    }

    const updated = await roleRepository.update(id, data, updaterId);
    if (!updated) {
      throw new NotFoundError('Role not found after update');
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt
      })),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      deletedAt: updated.deletedAt,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
      deletedBy: updated.deletedBy
    };
  }

  async delete(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    return roleRepository.delete(id);
  }
}
export const roleService = new RoleService();
