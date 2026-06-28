import { prisma } from '../../common/database/prisma.js';
import { CreateUserDto, UpdateUserDto } from '@enterprise/shared-types';
import { hashPassword } from '@enterprise/shared-utils';

const userInclude = {
  role: true,
  department: {
    include: { organization: true }
  }
};

export class UserRepository {
  async list({
    page,
    limit,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    organizationId,
    departmentId,
    excludeId
  }: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string;
    departmentId?: string;
    excludeId?: string;
  }) {
    const where: any = {};
    if (excludeId) {
      where.id = { not: excludeId };
    }
    if (departmentId) {
      where.departmentId = departmentId;
    } else if (organizationId) {
      where.department = { organizationId };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, include: userInclude, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.user.count({ where })
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id },
      include: userInclude
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email }
    });
  }

  async create(data: CreateUserDto, creatorId?: string) {
    const hashedPassword = await hashPassword(data.password || 'password123');
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        roleId: data.roleId || null,
        departmentId: data.departmentId || null,
        createdBy: creatorId
      },
      include: userInclude
    });
  }

  async update(id: string, data: UpdateUserDto, updaterId?: string) {
    const updateData: any = {
      name: data.name,
      email: data.email,
      roleId: data.roleId,
      departmentId: data.departmentId,
      updatedBy: updaterId
    };
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }
    return prisma.user.update({ where: { id }, data: updateData, include: userInclude });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();
