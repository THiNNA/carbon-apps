import { prisma } from '../../common/database/prisma.js';

export class TransactionLogRepository {
  async list({
    page,
    limit,
    search,
    module,
    action,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }: {
    page: number;
    limit: number;
    search?: string;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: any = {};

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {

      where.OR = [
        { userEmail: { contains: search } },
        { userName: { contains: search } },
        { targetName: { contains: search } },
        { targetId: { contains: search } }
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.transactionLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.transactionLog.count({ where })
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.transactionLog.findUnique({
      where: { id }
    });
  }

  async create(data: {
    userId?: string | null;
    userEmail?: string | null;
    userName?: string | null;
    action: string;
    module: string;
    targetId?: string | null;
    targetName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    requestData?: string | null;
    responseData?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return prisma.transactionLog.create({
      data
    });
  }

  async cleanup(sixMonthsAgo: Date) {
    const result = await prisma.transactionLog.deleteMany({
      where: {
        createdAt: {
          lt: sixMonthsAgo
        }
      }
    });
    return result.count;
  }
}

export const transactionLogRepository = new TransactionLogRepository();

