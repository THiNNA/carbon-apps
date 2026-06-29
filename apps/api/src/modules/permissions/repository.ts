import { prisma } from '../../common/database/prisma.js';
import { CreatePermissionDto, UpdatePermissionDto } from '@enterprise/shared-types';

export class PermissionRepository {
  async list({
    page,
    limit,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {};

    if (search) {
      where.name = { contains: search };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.permission.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.permission.findFirst({
      where: {
        id
      }
    });
  }

  async findByName(name: string) {
    return prisma.permission.findFirst({
      where: {
        name
      }
    });
  }

  async create(data: CreatePermissionDto, creatorId?: string) {
    return prisma.permission.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: creatorId
      }
    });
  }

  async update(id: string, data: UpdatePermissionDto, updaterId?: string) {
    return prisma.permission.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        updatedBy: updaterId
      }
    });
  }

  async delete(id: string) {
    return prisma.permission.delete({
      where: { id }
    });
  }
}
export const permissionRepository = new PermissionRepository();
