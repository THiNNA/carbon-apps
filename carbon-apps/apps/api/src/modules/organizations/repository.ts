import { prisma } from '../../common/database/prisma.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from '@enterprise/shared-types';

export class OrganizationRepository {
  async list({
    page,
    limit,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeSystem = false  // ซ่อน org SYSTEM จากทุก listing/dropdown โดย default
  }: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeSystem?: boolean;
  }) {
    const where: any = {};

    // ซ่อน System org ออกจาก listing ปกติ
    if (!includeSystem) {
      where.isSystem = false;
    }

    if (search) {
      // ใช้ AND เพื่อรวม isSystem filter กับ search condition
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } }
          ]
        }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: { _count: { select: { departments: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.organization.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.organization.findFirst({
      where: { id },
      include: { _count: { select: { departments: true } } }
    });
  }

  async findByCode(code: string, excludeId?: string) {
    return prisma.organization.findFirst({
      where: { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) }
    });
  }

  async create(data: CreateOrganizationDto, creatorId?: string) {
    return prisma.organization.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        address: data.address,
        phone: data.phone,
        createdBy: creatorId
      },
      include: { _count: { select: { departments: true } } }
    });
  }

  async update(id: string, data: UpdateOrganizationDto, updaterId?: string) {
    return prisma.organization.update({
      where: { id },
      data: { ...data, updatedBy: updaterId },
      include: { _count: { select: { departments: true } } }
    });
  }

  async delete(id: string) {
    return prisma.organization.delete({
      where: { id }
    });
  }
}

export const organizationRepository = new OrganizationRepository();
