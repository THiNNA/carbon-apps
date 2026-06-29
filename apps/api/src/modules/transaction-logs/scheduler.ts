import { transactionLogService } from './service.js';

/**
 * คำนวณระยะเวลามิลลิวินาทีที่เหลือก่อนถึงวันที่ 1 ของเดือนถัดไป เวลา 00:00:00 น.
 */
function getMsUntilNextFirstOfMonthMidnight(): number {
  const now = new Date();
  // สร้างเวลาเป้าหมาย: วันที่ 1 ของเดือนถัดไป (Month + 1) เวลา 00:00:00
  const nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return nextRun.getTime() - now.getTime();
}

/**
 * เริ่มตั้งเวลารันตัวล้างข้อมูลธุรกรรมรอบถัดไป
 */
function scheduleNextRun() {
  const delay = getMsUntilNextFirstOfMonthMidnight();
  const nextRunDate = new Date(Date.now() + delay);
  
  console.log(`[Scheduler] Next transaction log cleanup scheduled at: ${nextRunDate.toLocaleString()}`);
  
  setTimeout(async () => {
    console.log('[Scheduler] Starting monthly transaction log cleanup...');
    await transactionLogService.cleanup();
    
    // ตั้งเวลารอบถัดไปวนลูป
    scheduleNextRun();
  }, delay);
}

export function initTransactionLogCleanupScheduler() {
  console.log('[Scheduler] Initializing Transaction Log Cleanup Scheduler (Every 1st of month at midnight)...');

  // รันครั้งแรกหลังสตาร์ทระบบ 10 วินาที เพื่อทำความสะอาดเบื้องต้น
  setTimeout(async () => {
    console.log('[Scheduler] Running initial startup transaction log cleanup...');
    await transactionLogService.cleanup();
  }, 10000);

  // เริ่มต้นจัดตารางการรันถัดไปสำหรับรายเดือน
  scheduleNextRun();
}
