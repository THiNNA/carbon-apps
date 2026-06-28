import { prisma } from '../../common/database/prisma.js';
import { CreateDepartmentDto, UpdateDepartmentDto } from '@enterprise/shared-types';

export class DepartmentRepository {
  async list({
    page,
    limit,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    organizationId
  }: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string;
  }) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          organization: true,
          _count: { select: { users: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.department.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.department.findFirst({
      where: { id },
      include: { organization: true, _count: { select: { users: true } } }
    });
  }

  async findByCodeAndOrg(code: string, organizationId: string, excludeId?: string) {
    return prisma.department.findFirst({
      where: {
        code,
        organizationId,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
  }

  async listAll(organizationId?: string) {
    return prisma.department.findMany({
      where: { ...(organizationId ? { organizationId } : {}) },
      include: { organization: true },
      orderBy: { name: 'asc' }
    });
  }

  async create(data: CreateDepartmentDto, creatorId?: string) {
    return prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
        createdBy: creatorId
      },
      include: { organization: true, _count: { select: { users: true } } }
    });
  }

  async update(id: string, data: UpdateDepartmentDto, updaterId?: string) {
    return prisma.department.update({
      where: { id },
      data: { ...data, updatedBy: updaterId },
      include: { organization: true, _count: { select: { users: true } } }
    });
  }

  async delete(id: string) {
    return prisma.department.delete({
      where: { id }
    });
  }
}

export const departmentRepository = new DepartmentRepository();
