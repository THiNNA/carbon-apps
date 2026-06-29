import { transactionLogRepository } from './repository.js';
import { TransactionLogDto } from '@enterprise/shared-types';
import { NotFoundError } from '../../common/errors/custom-errors.js';

function toDto(log: any): TransactionLogDto {
  return {
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    userName: log.userName,
    action: log.action,
    module: log.module,
    targetId: log.targetId,
    targetName: log.targetName,
    oldValue: log.oldValue,
    newValue: log.newValue,
    requestData: log.requestData,
    responseData: log.responseData,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  };
}

export class TransactionLogService {
  async list(params: {
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
    const { items, total } = await transactionLogRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);
    return {
      items: items.map(toDto),
      meta: { page: params.page, limit: params.limit, total, totalPages }
    };
  }

  async findById(id: string): Promise<TransactionLogDto> {
    const log = await transactionLogRepository.findById(id);
    if (!log) throw new NotFoundError('Transaction log not found');
    return toDto(log);
  }

  /**
   * บันทึก Log แบบปลอดภัย (Async Non-blocking) เพื่อไม่ให้กระทบ Flow หลักของระบบหากเกิดข้อผิดพลาด
   */
  async log(data: {
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
    try {
      // ดำเนินการสร้าง log
      await transactionLogRepository.create(data);
    } catch (error) {
      // ล็อก error ลง console แต่ไม่ throw ต่อ เพื่อไม่ให้กระบวนการหลักหยุดทำงาน
      console.error('Failed to write transaction log:', error);
    }
  }

  async cleanup() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    try {
      const deletedCount = await transactionLogRepository.cleanup(sixMonthsAgo);
      
      if (deletedCount > 0) {
        console.log(`[Scheduler] Cleaned up ${deletedCount} transaction logs older than 6 months.`);
        // บันทึกกิจกรรมลง Log ด้วยเพื่อความโปร่งใสใน Audit Trail
        await this.log({
          action: 'DELETE',
          module: 'TransactionLog',
          targetName: `ล้างข้อมูลประวัติธุรกรรมอัตโนมัติ (เก่ากว่า 6 เดือน)`,
          newValue: JSON.stringify({ deletedCount, limitDate: sixMonthsAgo })
        });
      } else {
        console.log('[Scheduler] No transaction logs older than 6 months to clean.');
      }
    } catch (error) {
      console.error('[Scheduler] Failed to cleanup transaction logs automatically:', error);
    }
  }
}

export const transactionLogService = new TransactionLogService();

