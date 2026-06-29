import { prisma } from '../../common/database/prisma.js';
import { CreateCarbonRecordDto, UpdateCarbonRecordDto } from '@enterprise/shared-types';

export class CarbonRecordRepository {
  async list({
    page,
    limit,
    departmentId,
    organizationId,
    year,
    month,
    status,
    sortBy = 'year',
    sortOrder = 'desc',
  }: {
    page: number;
    limit: number;
    departmentId?: string;
    organizationId?: string;
    year?: number;
    month?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (year) where.year = year;
    if (month) where.month = month;
    if (status) where.status = status;
    if (organizationId) {
      where.department = { organizationId };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.carbonRecord.findMany({
        where,
        include: {
          department: { include: { organization: true } }
        },
        orderBy: [{ [sortBy]: sortOrder }, { month: sortOrder }],
        skip,
        take: limit,
      }),
      prisma.carbonRecord.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.carbonRecord.findFirst({
      where: { id },
      include: { department: { include: { organization: true } } }
    });
  }

  async findByDeptYearMonth(departmentId: string, year: number, month: number, excludeId?: string) {
    return prisma.carbonRecord.findFirst({
      where: {
        departmentId,
        year,
        month,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
  }

  async create(data: CreateCarbonRecordDto & {
    scope1Co2e: number;
    scope2Co2e: number;
    scope3Co2e: number;
    totalCo2e: number;
    totalReducedCo2e: number;
    netCo2e: number;
  }, creatorId?: string) {
    return prisma.carbonRecord.create({
      data: {
        ...data,
        createdBy: creatorId,
      },
      include: { department: { include: { organization: true } } }
    });
  }

  async update(id: string, data: UpdateCarbonRecordDto & { totalCo2e?: number }, updaterId?: string) {
    return prisma.carbonRecord.update({
      where: { id },
      data: { ...data, updatedBy: updaterId },
      include: { department: { include: { organization: true } } }
    });
  }

  async hardDelete(id: string) {
    return prisma.carbonRecord.delete({
      where: { id }
    });
  }
}

export const carbonRecordRepository = new CarbonRecordRepository();
