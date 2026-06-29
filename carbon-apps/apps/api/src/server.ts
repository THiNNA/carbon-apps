import { buildApp } from './app.js';
import { config } from './common/config/env.js';
import { initTransactionLogCleanupScheduler } from './modules/transaction-logs/scheduler.js';

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 Server running on port ${config.PORT}`);
    
    // เริ่มต้นระบบตั้งเวลาสำหรับล้างประวัติธุรกรรมอัตโนมัติเบื้องหลัง
    initTransactionLogCleanupScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

