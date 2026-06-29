import { FastifyInstance } from 'fastify';
import { emissionFactorController } from './controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.js';

export async function emissionFactorRoutes(app: FastifyInstance) {
  // ทุกคนต้องระบุตัวตนก่อนเข้าใช้งาน
  app.addHook('preHandler', authenticate);

  // Read-only endpoints: เข้าถึงได้ทุกคนที่มีสิทธิ์ในระบบ (รวมถึง User ธรรมดาเพื่อใช้ในฟอร์มคำนวณ)
  app.get('/', emissionFactorController.list.bind(emissionFactorController));
  app.get('/groups', emissionFactorController.groups.bind(emissionFactorController));
  app.get('/:id', emissionFactorController.getById.bind(emissionFactorController));
  app.get('/system-defaults', emissionFactorController.listSystemDefaults.bind(emissionFactorController));

  // Write/Mutate endpoints: เฉพาะ Admin หรือ SuperAdmin เท่านั้น
  const adminGuard = { preHandler: [requireRole('Admin')] };
  app.post('/', adminGuard, emissionFactorController.create.bind(emissionFactorController));
  app.put('/:id', adminGuard, emissionFactorController.update.bind(emissionFactorController));
  app.post('/bulk-update', adminGuard, emissionFactorController.bulkUpdate.bind(emissionFactorController));
  app.post('/clone', adminGuard, emissionFactorController.clone.bind(emissionFactorController));
  app.post('/initialize', adminGuard, emissionFactorController.initialize.bind(emissionFactorController));
  app.delete('/', adminGuard, emissionFactorController.delete.bind(emissionFactorController));
  app.post('/system-defaults/initialize', adminGuard, emissionFactorController.initializeSystemDefaults.bind(emissionFactorController));
}
