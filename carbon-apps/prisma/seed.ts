import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Permissions
  const permissionsData = [
    { name: 'users:create', description: 'Create new users' },
    { name: 'users:read', description: 'Read user details and list users' },
    { name: 'users:update', description: 'Update existing users' },
    { name: 'users:delete', description: 'Delete users (soft delete)' },
    { name: 'users:restore', description: 'Restore soft-deleted users' },
    
    { name: 'roles:create', description: 'Create new roles' },
    { name: 'roles:read', description: 'Read role details and list roles' },
    { name: 'roles:update', description: 'Update existing roles' },
    { name: 'roles:delete', description: 'Delete roles' },
    { name: 'roles:restore', description: 'Restore soft-deleted roles' },

    { name: 'permissions:read', description: 'Read permission details and list permissions' },
    { name: 'dashboard:read', description: 'View dashboard statistics' },

    { name: 'organizations:create', description: 'Create new organizations' },
    { name: 'organizations:read', description: 'Read organization details' },
    { name: 'organizations:update', description: 'Update organizations' },
    { name: 'organizations:delete', description: 'Delete organizations' },
    { name: 'organizations:restore', description: 'Restore organizations' },

    { name: 'departments:create', description: 'Create new departments' },
    { name: 'departments:read', description: 'Read department details' },
    { name: 'departments:update', description: 'Update departments' },
    { name: 'departments:delete', description: 'Delete departments' },
    { name: 'departments:restore', description: 'Restore departments' },

    { name: 'carbon-records:create', description: 'Create carbon emission records' },
    { name: 'carbon-records:read', description: 'Read carbon emission records' },
    { name: 'carbon-records:update', description: 'Update carbon emission records' },
    { name: 'carbon-records:delete', description: 'Delete carbon emission records' },
    { name: 'carbon-records:restore', description: 'Restore carbon emission records' }
  ];

  const permissions: any[] = [];
  for (const perm of permissionsData) {
    const createdPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description, createdBy: 'SYSTEM' }
    });
    permissions.push(createdPerm);
  }
  console.log(`✅ Created/verified ${permissions.length} permissions.`);

  // 2. Create Roles
  const roles = {
    superAdmin: await prisma.role.upsert({
      where: { name: 'SuperAdmin' },
      update: {},
      create: { name: 'SuperAdmin', description: 'Super Administrator with full access', createdBy: 'SYSTEM' }
    }),
    admin: await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', description: 'Administrator with org-scoped access', createdBy: 'SYSTEM' }
    }),
    user: await prisma.role.upsert({
      where: { name: 'User' },
      update: {},
      create: { name: 'User', description: 'Regular staff user with department-scoped access', createdBy: 'SYSTEM' }
    })
  };
  console.log('✅ Created/verified SuperAdmin, Admin, and User roles.');

  // 3. Assign Permissions to Roles
  // SuperAdmin gets ALL permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.superAdmin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roles.superAdmin.id, permissionId: perm.id, createdBy: 'SYSTEM' }
    });
  }

  // Admin: users CRUD + roles:read + permissions:read + dashboard:read + orgs:read + depts:read/create/update
  const adminPermNames = [
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:restore',
    'roles:read', 'permissions:read', 'dashboard:read',
    'organizations:read',
    'departments:read', 'departments:create', 'departments:update',
    'carbon-records:create', 'carbon-records:read', 'carbon-records:update', 'carbon-records:delete', 'carbon-records:restore'
  ];
  const adminPermissions = permissions.filter(p => adminPermNames.includes(p.name));
  for (const perm of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.admin.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roles.admin.id, permissionId: perm.id, createdBy: 'SYSTEM' }
    });
  }

  // User: users:read + dashboard:read + depts:read + orgs:read + carbon-records:create/read/update
  const userPermNames = ['users:read', 'dashboard:read', 'departments:read', 'organizations:read', 'carbon-records:create', 'carbon-records:read', 'carbon-records:update'];
  const userPermissions = permissions.filter(p => userPermNames.includes(p.name));
  for (const perm of userPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.user.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roles.user.id, permissionId: perm.id, createdBy: 'SYSTEM' }
    });
  }
  console.log('✅ Assigned permissions to roles.');

  // 4. Create Organization & Departments
  const org = await prisma.organization.upsert({
    where: { code: 'ORG001' },
    update: {
      name: 'สำนักงานสาธารณสุขอุดรธานี',
      description: 'สำนักงานสาธารณสุขจังหวัดอุดรธานี',
      address: 'ถนนอุดร-หนองคาย ตำบลหมากแข้ง อำเภอเมืองอุดรธานี จังหวัดอุดรธานี 41000',
      phone: '042-222-718',
    },
    create: {
      code: 'ORG001',
      name: 'สำนักงานสาธารณสุขอุดรธานี',
      description: 'สำนักงานสาธารณสุขจังหวัดอุดรธานี',
      address: 'ถนนอุดร-หนองคาย ตำบลหมากแข้ง อำเภอเมืองอุดรธานี จังหวัดอุดรธานี 41000',
      phone: '042-222-718',
      createdBy: 'SYSTEM'
    }
  });

  const departmentsData = [
    { code: 'DIG', name: 'กลุ่มงานสุขภาพดิจิทัล' },
    { code: 'CDC', name: 'กลุ่มงานควบคุมโรคติดต่อ' },
    { code: 'INS', name: 'กลุ่มงานประกันสุขภาพ' },
    { code: 'HPR', name: 'กลุ่มงานส่งเสริมสุขภาพ' },
    { code: 'HRM', name: 'กลุ่มงานบริหารทรัพยากรบุคคล' },
    { code: 'STR', name: 'กลุ่มงานพัฒนายุทธศาสตร์สาธารณสุข' },
    { code: 'CPH', name: 'กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข' },
    { code: 'ENV', name: 'กลุ่มงานอนามัยสิ่งแวดล้อมและอาชีวอนามัย' },
    { code: 'LAW', name: 'กลุ่มงานกฎหมาย' },
    { code: 'ADM', name: 'กลุ่มงานบริหารทั่วไป' },
    { code: 'DEN', name: 'กลุ่มงานทันตสาธารณสุข' },
    { code: 'PHC', name: 'กลุ่มงานปฐมภูมิและเครือข่ายสุขภาพ' },
    { code: 'QSI', name: 'กลุ่มงานพัฒนาคุณภาพและรูปแบบบริการ' },
    { code: 'TTM', name: 'กลุ่มงานแพทย์แผนไทยและการแพทย์ทางเลือก' },
    { code: 'COM', name: 'กลุ่มงานสื่อสารความเสี่ยงและประชาสัมพันธ์' },
    { code: 'NCD', name: 'กลุ่มงานควบคุมโรคไม่ติดต่อสุขภาพจิตและยาเสพติด' },
  ];

  const deptMap: Record<string, any> = {};
  for (const dept of departmentsData) {
    const created = await prisma.department.upsert({
      where: { code_organizationId: { code: dept.code, organizationId: org.id } },
      update: { name: dept.name },
      create: { code: dept.code, name: dept.name, organizationId: org.id, createdBy: 'SYSTEM' }
    });
    deptMap[dept.code] = created;
  }
  console.log(`✅ Created/verified organization "${org.name}" with ${departmentsData.length} departments.`);

  // 5. Create Default Users
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  // SuperAdmin — no department restriction
  const superUser = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      name: 'System SuperAdmin',
      roleId: roles.superAdmin.id,
      createdBy: 'SYSTEM'
    }
  });

  // Admin — assigned to กลุ่มงานสุขภาพดิจิทัล (org-scoped)
  const normalAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { departmentId: deptMap['DIG'].id },
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'IT Admin',
      roleId: roles.admin.id,
      departmentId: deptMap['DIG'].id,
      createdBy: 'SYSTEM'
    }
  });

  // User — assigned to กลุ่มงานบริหารทั่วไป (department-scoped)
  const standardUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { departmentId: deptMap['ADM'].id },
    create: {
      email: 'user@example.com',
      password: hashedPassword,
      name: 'HR Staff',
      roleId: roles.user.id,
      departmentId: deptMap['ADM'].id,
      createdBy: 'SYSTEM'
    }
  });

  // 6. Create Default Emission Factors (for 2025 and 2026)
  const defaultFactors = [
    // Scope 1
    { category: 'scope1', key: 's1StationaryDiesel', name: 'น้ำมันดีเซลสำหรับเครื่องจักร', value: 2.7078, unit: 'kgCO2e/ลิตร' },
    { category: 'scope1', key: 's1StationaryGasoline', name: 'น้ำมันเบนซินสำหรับเครื่องจักร', value: 2.1894, unit: 'kgCO2e/ลิตร' },
    { category: 'scope1', key: 's1CookingLpg', name: 'แก๊สหุงต้ม LPG', value: 3.1134, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1VehicleDiesel', name: 'น้ำมันดีเซลสำหรับยานพาหนะ', value: 2.7406, unit: 'kgCO2e/ลิตร' },
    { category: 'scope1', key: 's1VehicleGasoline', name: 'น้ำมันเบนซินสำหรับยานพาหนะ', value: 2.2394, unit: 'kgCO2e/ลิตร' },
    { category: 'scope1', key: 's1VehicleCng', name: 'ก๊าซธรรมชาติ CNG สำหรับยานพาหนะ', value: 2.2609, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1FireExtCo2', name: 'ถังดับเพลิง CO2', value: 1.0000, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1RefrigHfc134a', name: 'สารทำความเย็น HFC-134a', value: 1300.0000, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1RefrigR22', name: 'สารทำความเย็น R22', value: 1760.0000, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1AnesthesiaN2o', name: 'ยาสลบไนตรัสออกไซด์ (N2O)', value: 0.3249, unit: 'kgCO2e/มล.' },
    { category: 'scope1', key: 's1AnesthesiaIsoflur', name: 'ยาสลบ Isoflurane', value: 0.8160, unit: 'kgCO2e/มล.' },
    { category: 'scope1', key: 's1AnesthesiaDesflu', name: 'ยาสลบ Desflurane', value: 3.6805, unit: 'kgCO2e/มล.' },
    { category: 'scope1', key: 's1AnesthesiaSevoflur', name: 'ยาสลบ Sevoflurane', value: 0.2196, unit: 'kgCO2e/มล.' },
    { category: 'scope1', key: 's1InfWasteAutoclave', name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายใน', value: 0.2430, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1OrganicWasteFerment', name: 'ขยะอินทรีย์หมักภายใน', value: 0.3338, unit: 'kgCO2e/กก.' },
    { category: 'scope1', key: 's1OrganicWasteCompost', name: 'ขยะอินทรีย์ปุ๋ยหมักภายใน', value: 0.1102, unit: 'kgCO2e/กก.' },
    // Scope 2
    { category: 'scope2', key: 's2Electricity', name: 'การใช้ไฟฟ้ากระแสไฟฟ้า', value: 0.5781, unit: 'kgCO2e/kWh' },
    // Scope 3
    { category: 'scope3', key: 's3Water', name: 'การใช้น้ำประปา', value: 0.5411, unit: 'kgCO2e/ลบ.ม.' },
    { category: 'scope3', key: 's3PaperA4', name: 'การเบิกกระดาษ A4', value: 5.2540, unit: 'kgCO2e/รีม' },
    { category: 'scope3', key: 's3PlasticBag', name: 'การใช้ถุงขยะพลาสติก', value: 6.7070, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3OutsourceDiesel', name: 'น้ำมันดีเซลจ้างเหมาขนส่ง', value: 2.7406, unit: 'kgCO2e/ลิตร' },
    { category: 'scope3', key: 's3OutsourceGasoline', name: 'น้ำมันเบนซินจ้างเหมาขนส่ง', value: 2.2394, unit: 'kgCO2e/ลิตร' },
    { category: 'scope3', key: 's3GeneralWasteLandfill', name: 'ขยะทั่วไปฝังกลบภายนอก', value: 0.5000, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3HazardousWasteLandfill', name: 'ขยะอันตรายฝังกลบภายนอก', value: 0.5000, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3HazardousWasteIncin', name: 'ขยะอันตรายเผาภายนอก', value: 0.5000, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3InfWasteIncin', name: 'ขยะติดเชื้อเผาภายนอก', value: 0.5000, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3InfWasteAutoclaveExt', name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายนอก', value: 0.2430, unit: 'kgCO2e/กก.' },
    { category: 'scope3', key: 's3TravelCar', name: 'การเดินทางด้วยรถยนต์ส่วนตัว/องค์กร', value: 0.1680, unit: 'kgCO2e/กม.' },
    { category: 'scope3', key: 's3TravelPlane', name: 'การเดินทางด้วยเครื่องบินชั้นประหยัด', value: 0.1539, unit: 'kgCO2e/กม.' },
    // Reduction
    { category: 'reduction', key: 'compostFoodWaste', name: 'ปุ๋ยหมักเศษอาหาร', value: 0.4300, unit: 'kgCO2e/กก.' },
    { category: 'reduction', key: 'compostLeafBranch', name: 'ปุ๋ยหมักกิ่งไม้ใบไม้', value: 0.1102, unit: 'kgCO2e/กก.' },
    { category: 'reduction', key: 'solarElectricity', name: 'การผลิตไฟฟ้า Solar Cell', value: 0.5781, unit: 'kgCO2e/kWh' },
    { category: 'reduction', key: 'treePerYear', name: 'การดูดกลับคาร์บอนของไม้ยืนต้น', value: 3.6700, unit: 'kgCO2e/ต้น/ปี' }
  ];

  for (const year of [2025, 2026]) {
    for (const factor of defaultFactors) {
      await prisma.emissionFactor.upsert({
        where: { year_key: { year, key: factor.key } },
        update: {
          category: factor.category,
          name: factor.name,
          value: factor.value,
          unit: factor.unit
        },
        create: {
          year,
          category: factor.category,
          key: factor.key,
          name: factor.name,
          value: factor.value,
          unit: factor.unit,
          createdBy: 'SYSTEM'
        }
      });
    }
  }
  console.log('✅ Created/verified default Emission Factors for 2025 and 2026.');

  console.log(`✅ Default SuperAdmin: ${superUser.email} (ไม่มีสังกัด — เข้าถึงทุกองค์กร)`);
  console.log(`✅ Default Admin: ${normalAdmin.email} → สังกัด ${deptMap['DIG'].name}`);
  console.log(`✅ Default User: ${standardUser.email} → สังกัด ${deptMap['ADM'].name}`);
  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
