import { userRepository } from './repository.js';
import { CreateUserDto, UpdateUserDto, UserDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';

function toDto(user: any): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    role: user.role ? {
      id: user.role.id,
      name: user.role.name,
      description: user.role.description,
      createdAt: user.role.createdAt,
      updatedAt: user.role.updatedAt
    } : null,
    departmentId: user.departmentId,
    department: user.department ? {
      id: user.department.id,
      code: user.department.code,
      name: user.department.name,
      description: user.department.description,
      organizationId: user.department.organizationId,
      organization: user.department.organization ? {
        id: user.department.organization.id,
        code: user.department.organization.code,
        name: user.department.organization.name,
        createdAt: user.department.organization.createdAt,
        updatedAt: user.department.organization.updatedAt
      } : null,
      createdAt: user.department.createdAt,
      updatedAt: user.department.updatedAt
    } : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    createdBy: user.createdBy,
    updatedBy: user.updatedBy,
    deletedBy: user.deletedBy
  };
}

export class UserService {
  async list(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string;
    departmentId?: string;
  }) {
    const { items, total } = await userRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);
    return {
      items: items.map(toDto),
      meta: { page: params.page, limit: params.limit, total, totalPages }
    };
  }

  async findById(id: string): Promise<UserDto> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return toDto(user);
  }

  async create(data: CreateUserDto, creatorId?: string): Promise<UserDto> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new BadRequestError('Email already registered');
    const user = await userRepository.create(data, creatorId);
    return toDto(user);
  }

  async update(id: string, data: UpdateUserDto, updaterId?: string): Promise<UserDto> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new BadRequestError('Email already registered');
    }
    const updated = await userRepository.update(id, data, updaterId);
    return toDto(updated);
  }

  async delete(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return userRepository.delete(id);
  }
}

export const userService = new UserService();
