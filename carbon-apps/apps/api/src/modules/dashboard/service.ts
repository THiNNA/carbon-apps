import { prisma } from '../../common/database/prisma.js';
import { DashboardStatsDto, UserDto, TokenPayload, CarbonDashboardStatsDto } from '@enterprise/shared-types';
import { EF, EF_REDUCTION, loadFactorsForYearAndOrg } from '../carbon-records/service.js';

export class DashboardService {
  async getStats(): Promise<DashboardStatsDto> {
    const [usersCount, rolesCount, permissionsCount, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const recentUserDtos: UserDto[] = recentUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      deletedBy: user.deletedBy
    }));

    return {
      usersCount,
      rolesCount,
      permissionsCount,
      activeSessionsCount: 0,
      recentUsers: recentUserDtos
    };
  }

  async getCarbonStats(
    user: TokenPayload,
    filter: { year: number; baseYear: number; organizationId?: string; departmentId?: string }
  ): Promise<CarbonDashboardStatsDto> {
    const where: any = {
      year: { in: [filter.year, filter.baseYear] }
    };

    // Role-based filtering
    if (user.roles.includes('SuperAdmin')) {
      if (filter.departmentId) {
        where.departmentId = filter.departmentId;
      } else if (filter.organizationId) {
        where.department = { organizationId: filter.organizationId };
      }
    } else if (user.roles.includes('Admin')) {
      const orgId = user.organizationId;
      if (filter.departmentId) {
        where.departmentId = filter.departmentId;
        where.department = { organizationId: orgId };
      } else {
        where.department = { organizationId: orgId };
      }
    } else {
      // User is department-scoped
      where.departmentId = user.departmentId || 'undefined';
    }

    const targetOrgId = user.roles.includes('SuperAdmin')
      ? filter.organizationId
      : (user.organizationId ?? filter.organizationId);

    // ─── (1) โหลด EF และ Aggregate Stats พร้อมกัน (Parallel) ──────────────────
    // ใช้ Promise.all เพื่อรัน 3 งานพร้อมกัน แทนที่จะรอทีละอย่าง
    const [
      { ef: efCurrent, efRed: efRedCurrent },
      { ef: efBase, efRed: efRedBase },
      // SQL Aggregation: ให้ DB รวมค่าให้แทน in-memory loop
      currentAgg,
      baseAgg,
      // โหลด records เฉพาะ fields ที่ต้องใช้คำนวณ breakdown+activities (ไม่ include relations ใหญ่)
      records
    ] = await Promise.all([
      loadFactorsForYearAndOrg(filter.year, targetOrgId),
      loadFactorsForYearAndOrg(filter.baseYear, targetOrgId),
      // Aggregate ปีปัจจุบัน
      prisma.carbonRecord.aggregate({
        where: { ...where, year: filter.year },
        _sum: {
          scope1Co2e: true,
          scope2Co2e: true,
          scope3Co2e: true,
          totalCo2e: true,
          totalReducedCo2e: true,
          netCo2e: true,
          redTreeCount: true,
        }
      }),
      // Aggregate ปีฐาน
      prisma.carbonRecord.aggregate({
        where: { ...where, year: filter.baseYear },
        _sum: {
          scope1Co2e: true,
          scope2Co2e: true,
          scope3Co2e: true,
          totalCo2e: true,
          totalReducedCo2e: true,
          netCo2e: true,
          redTreeCount: true,
        }
      }),
      // เฉพาะ records ปีปัจจุบันสำหรับ breakdown + Top Activities (ไม่ include relations)
      prisma.carbonRecord.findMany({
        where: { ...where },
        select: {
          year: true,
          redTreeCount: true,
          totalReducedCo2e: true,
          // Scope 1 fields
          s1StationaryDieselLiters: true, s1StationaryGasolineLiters: true, s1CookingLpgKg: true,
          s1VehicleDieselLiters: true, s1VehicleGasolineLiters: true, s1VehicleCngKg: true,
          s1FireExtCo2Kg: true, s1RefrigHfc134aKg: true, s1RefrigR22Kg: true,
          s1AnesthesiaN2oMl: true, s1AnesthesiaIsoflurMl: true, s1AnesthesiaDesfluMl: true, s1AnesthesiaSevoflurMl: true,
          s1InfWasteAutoclaveKg: true, s1OrganicWasteFermentKg: true, s1OrganicWasteCompostKg: true,
          s1WastewaterWaterM3: true, s1WastewaterCodAnaerobicShallow: true, s1WastewaterCodAnaerobicDeep: true,
          // Scope 2
          s2ElectricityKwh: true,
          // Scope 3
          s3WaterCubicM: true, s3PaperA4Reams: true, s3PlasticBagKg: true,
          s3OutsourceDieselLiters: true, s3OutsourceGasolineLiters: true,
          s3GeneralWasteKg: true, s3HazardousWasteLandfillKg: true, s3HazardousWasteIncinKg: true,
          s3InfWasteIncinKg: true, s3InfWasteAutoclaveExtKg: true,
          s3TravelCarKm: true, s3TravelPlaneKm: true,
        }
      })
    ]);

    // ─── (2) สร้าง Summary จาก SQL Aggregate Results ──────────────────────────
    const treeRemovalCurrent = (currentAgg._sum.redTreeCount ?? 0) * (efRedCurrent.treePerYear / 12);
    const treeRemovalBase    = (baseAgg._sum.redTreeCount ?? 0) * (efRedBase.treePerYear / 12);

    const summary = {
      baseYear: {
        year: filter.baseYear,
        emission:  baseAgg._sum.totalCo2e ?? 0,
        reduction: Math.max(0, (baseAgg._sum.totalReducedCo2e ?? 0) - treeRemovalBase),
        removal:   treeRemovalBase,
        net:       baseAgg._sum.netCo2e ?? 0,
        scope1:    baseAgg._sum.scope1Co2e ?? 0,
        scope2:    baseAgg._sum.scope2Co2e ?? 0,
        scope3:    baseAgg._sum.scope3Co2e ?? 0,
      },
      currentYear: {
        year: filter.year,
        emission:  currentAgg._sum.totalCo2e ?? 0,
        reduction: Math.max(0, (currentAgg._sum.totalReducedCo2e ?? 0) - treeRemovalCurrent),
        removal:   treeRemovalCurrent,
        net:       currentAgg._sum.netCo2e ?? 0,
        scope1:    currentAgg._sum.scope1Co2e ?? 0,
        scope2:    currentAgg._sum.scope2Co2e ?? 0,
        scope3:    currentAgg._sum.scope3Co2e ?? 0,
      }
    };

    // ─── (3) คำนวณ Scope Breakdown + Top Activities จาก records ─────────────
    const initBreakdown = () => ({
      scope1: { stationary: 0, mobile: 0, fugitive: 0, waste: 0, wastewater: 0 },
      scope2: { electricity: 0 },
      scope3: { resources: 0, outsourcedFuel: 0, externalWaste: 0, travel: 0 }
    });

    const scopeBreakdown = {
      baseYear:    initBreakdown(),
      currentYear: initBreakdown()
    };

    const activitiesMap: Record<string, number> = {
      'การใช้ไฟฟ้า': 0, 'การใช้น้ำมันดีเซลสำหรับยานพาหนะ': 0, 'การบำบัดน้ำเสีย': 0,
      'การเบิกกระดาษ A4': 0, 'การใช้ถุงขยะพลาสติก': 0, 'การใช้น้ำประปา': 0,
      'การใช้น้ำมันดีเซลสำหรับเครื่องจักร': 0, 'การใช้น้ำมันเบนซินสำหรับเครื่องจักร': 0,
      'การใช้แก๊สหุงต้ม': 0, 'การใช้น้ำมันเบนซินสำหรับยานพาหนะ': 0, 'การใช้ CNG สำหรับยานพาหนะ': 0,
      'ถังดับเพลิง CO2': 0, 'การใช้สารทำความเย็น HFC-134a': 0, 'การใช้สารทำความเย็น R22': 0,
      'ยาสลบไนตรัสออกไซด์ (N2O)': 0, 'ยาสลบ Isoflurane': 0, 'ยาสลบ Desflurane': 0, 'ยาสลบ Sevoflurane': 0,
      'มูลฝอยติดเชื้อภายใน (Autoclave)': 0, 'ขยะอินทรีย์หมักภายใน': 0, 'ขยะอินทรีย์ปุ๋ยหมักภายใน': 0,
      'การใช้น้ำมันดีเซลจ้างเหมา': 0, 'การใช้น้ำมันเบนซินจ้างเหมา': 0,
      'มูลฝอยทั่วไปภายนอก (ฝังกลบ)': 0, 'มูลฝอยอันตรายภายนอก (ฝังกลบ)': 0,
      'มูลฝอยอันตรายภายนอก (เผา)': 0, 'มูลฝอยติดเชื้อภายนอก (เผา)': 0,
      'มูลฝอยติดเชื้อภายนอก (Autoclave)': 0, 'การเดินทางโดยรถยนต์': 0, 'การเดินทางโดยเครื่องบิน': 0
    };

    for (const r of records) {
      const isCurrent = r.year === filter.year;
      const targetBreakdown = isCurrent ? scopeBreakdown.currentYear : scopeBreakdown.baseYear;
      const ef = isCurrent ? efCurrent : efBase;

      // Scope 1 breakdowns
      const stationary  = (r.s1StationaryDieselLiters || 0) * ef.s1StationaryDiesel + (r.s1StationaryGasolineLiters || 0) * ef.s1StationaryGasoline + (r.s1CookingLpgKg || 0) * ef.s1CookingLpg;
      const mobile      = (r.s1VehicleDieselLiters || 0) * ef.s1VehicleDiesel + (r.s1VehicleGasolineLiters || 0) * ef.s1VehicleGasoline + (r.s1VehicleCngKg || 0) * ef.s1VehicleCng;
      const fugitive    = (r.s1FireExtCo2Kg || 0) * ef.s1FireExtCo2 + (r.s1RefrigHfc134aKg || 0) * ef.s1RefrigHfc134a + (r.s1RefrigR22Kg || 0) * ef.s1RefrigR22 + (r.s1AnesthesiaN2oMl || 0) * ef.s1AnesthesiaN2o + (r.s1AnesthesiaIsoflurMl || 0) * ef.s1AnesthesiaIsoflur + (r.s1AnesthesiaDesfluMl || 0) * ef.s1AnesthesiaDesflu + (r.s1AnesthesiaSevoflurMl || 0) * ef.s1AnesthesiaSevoflur;
      const waste       = (r.s1InfWasteAutoclaveKg || 0) * ef.s1InfWasteAutoclave + (r.s1OrganicWasteFermentKg || 0) * ef.s1OrganicWasteFerment + (r.s1OrganicWasteCompostKg || 0) * ef.s1OrganicWasteCompost;
      const wastewater  = (5 * (r.s1WastewaterWaterM3 || 0) * ((r.s1WastewaterCodAnaerobicShallow || 0) / 1000)) + (20 * (r.s1WastewaterWaterM3 || 0) * ((r.s1WastewaterCodAnaerobicDeep || 0) / 1000));
      targetBreakdown.scope1.stationary += stationary;
      targetBreakdown.scope1.mobile     += mobile;
      targetBreakdown.scope1.fugitive   += fugitive;
      targetBreakdown.scope1.waste      += waste;
      targetBreakdown.scope1.wastewater += wastewater;

      // Scope 2
      const electricity = (r.s2ElectricityKwh || 0) * ef.s2Electricity;
      targetBreakdown.scope2.electricity += electricity;

      // Scope 3
      const resources      = (r.s3WaterCubicM || 0) * ef.s3Water + (r.s3PaperA4Reams || 0) * ef.s3PaperA4 + (r.s3PlasticBagKg || 0) * ef.s3PlasticBag;
      const outsourcedFuel = (r.s3OutsourceDieselLiters || 0) * ef.s3OutsourceDiesel + (r.s3OutsourceGasolineLiters || 0) * ef.s3OutsourceGasoline;
      const externalWaste  = (r.s3GeneralWasteKg || 0) * ef.s3GeneralWasteLandfill + (r.s3HazardousWasteLandfillKg || 0) * ef.s3HazardousWasteLandfill + (r.s3HazardousWasteIncinKg || 0) * ef.s3HazardousWasteIncin + (r.s3InfWasteIncinKg || 0) * ef.s3InfWasteIncin + (r.s3InfWasteAutoclaveExtKg || 0) * ef.s3InfWasteAutoclaveExt;
      const travel         = (r.s3TravelCarKm || 0) * ef.s3TravelCar + (r.s3TravelPlaneKm || 0) * ef.s3TravelPlane;
      targetBreakdown.scope3.resources      += resources;
      targetBreakdown.scope3.outsourcedFuel += outsourcedFuel;
      targetBreakdown.scope3.externalWaste  += externalWaste;
      targetBreakdown.scope3.travel         += travel;

      // Top Activities (ปีปัจจุบันเท่านั้น)
      if (isCurrent) {
        activitiesMap['การใช้ไฟฟ้า']                        += electricity;
        activitiesMap['การใช้น้ำมันดีเซลสำหรับยานพาหนะ']   += (r.s1VehicleDieselLiters || 0) * ef.s1VehicleDiesel;
        activitiesMap['การบำบัดน้ำเสีย']                    += wastewater;
        activitiesMap['การเบิกกระดาษ A4']                   += (r.s3PaperA4Reams || 0) * ef.s3PaperA4;
        activitiesMap['การใช้ถุงขยะพลาสติก']               += (r.s3PlasticBagKg || 0) * ef.s3PlasticBag;
        activitiesMap['การใช้น้ำประปา']                     += (r.s3WaterCubicM || 0) * ef.s3Water;
        activitiesMap['การใช้น้ำมันดีเซลสำหรับเครื่องจักร'] += (r.s1StationaryDieselLiters || 0) * ef.s1StationaryDiesel;
        activitiesMap['การใช้น้ำมันเบนซินสำหรับเครื่องจักร'] += (r.s1StationaryGasolineLiters || 0) * ef.s1StationaryGasoline;
        activitiesMap['การใช้แก๊สหุงต้ม']                  += (r.s1CookingLpgKg || 0) * ef.s1CookingLpg;
        activitiesMap['การใช้น้ำมันเบนซินสำหรับยานพาหนะ']  += (r.s1VehicleGasolineLiters || 0) * ef.s1VehicleGasoline;
        activitiesMap['การใช้ CNG สำหรับยานพาหนะ']         += (r.s1VehicleCngKg || 0) * ef.s1VehicleCng;
        activitiesMap['ถังดับเพลิง CO2']                    += (r.s1FireExtCo2Kg || 0) * ef.s1FireExtCo2;
        activitiesMap['การใช้สารทำความเย็น HFC-134a']       += (r.s1RefrigHfc134aKg || 0) * ef.s1RefrigHfc134a;
        activitiesMap['การใช้สารทำความเย็น R22']            += (r.s1RefrigR22Kg || 0) * ef.s1RefrigR22;
        activitiesMap['ยาสลบไนตรัสออกไซด์ (N2O)']          += (r.s1AnesthesiaN2oMl || 0) * ef.s1AnesthesiaN2o;
        activitiesMap['ยาสลบ Isoflurane']                   += (r.s1AnesthesiaIsoflurMl || 0) * ef.s1AnesthesiaIsoflur;
        activitiesMap['ยาสลบ Desflurane']                   += (r.s1AnesthesiaDesfluMl || 0) * ef.s1AnesthesiaDesflu;
        activitiesMap['ยาสลบ Sevoflurane']                  += (r.s1AnesthesiaSevoflurMl || 0) * ef.s1AnesthesiaSevoflur;
        activitiesMap['มูลฝอยติดเชื้อภายใน (Autoclave)']   += (r.s1InfWasteAutoclaveKg || 0) * ef.s1InfWasteAutoclave;
        activitiesMap['ขยะอินทรีย์หมักภายใน']              += (r.s1OrganicWasteFermentKg || 0) * ef.s1OrganicWasteFerment;
        activitiesMap['ขยะอินทรีย์ปุ๋ยหมักภายใน']          += (r.s1OrganicWasteCompostKg || 0) * ef.s1OrganicWasteCompost;
        activitiesMap['การใช้น้ำมันดีเซลจ้างเหมา']         += (r.s3OutsourceDieselLiters || 0) * ef.s3OutsourceDiesel;
        activitiesMap['การใช้น้ำมันเบนซินจ้างเหมา']        += (r.s3OutsourceGasolineLiters || 0) * ef.s3OutsourceGasoline;
        activitiesMap['มูลฝอยทั่วไปภายนอก (ฝังกลบ)']      += (r.s3GeneralWasteKg || 0) * ef.s3GeneralWasteLandfill;
        activitiesMap['มูลฝอยอันตรายภายนอก (ฝังกลบ)']     += (r.s3HazardousWasteLandfillKg || 0) * ef.s3HazardousWasteLandfill;
        activitiesMap['มูลฝอยอันตรายภายนอก (เผา)']         += (r.s3HazardousWasteIncinKg || 0) * ef.s3HazardousWasteIncin;
        activitiesMap['มูลฝอยติดเชื้อภายนอก (เผา)']        += (r.s3InfWasteIncinKg || 0) * ef.s3InfWasteIncin;
        activitiesMap['มูลฝอยติดเชื้อภายนอก (Autoclave)']  += (r.s3InfWasteAutoclaveExtKg || 0) * ef.s3InfWasteAutoclaveExt;
        activitiesMap['การเดินทางโดยรถยนต์']               += (r.s3TravelCarKm || 0) * ef.s3TravelCar;
        activitiesMap['การเดินทางโดยเครื่องบิน']           += (r.s3TravelPlaneKm || 0) * ef.s3TravelPlane;
      }
    }

    const totalEmissionCurrent = summary.currentYear.emission || 1;
    const topActivities = Object.entries(activitiesMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: parseFloat(((value / totalEmissionCurrent) * 100).toFixed(2))
      }))
      .filter(act => act.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { summary, scopeBreakdown, topActivities };
  }

  async getAvailableYears(
    user: TokenPayload,
    filter: { organizationId?: string; departmentId?: string }
  ): Promise<number[]> {
    const where: any = {};

    if (user.roles.includes('SuperAdmin')) {
      if (filter.departmentId) {
        where.departmentId = filter.departmentId;
      } else if (filter.organizationId) {
        where.department = { organizationId: filter.organizationId };
      }
    } else if (user.roles.includes('Admin')) {
      const orgId = user.organizationId;
      if (filter.departmentId) {
        where.departmentId = filter.departmentId;
        where.department = { organizationId: orgId };
      } else {
        where.department = { organizationId: orgId };
      }
    } else {
      where.departmentId = user.departmentId || 'undefined';
    }

    const records = await prisma.carbonRecord.findMany({
      where,
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    });

    return records.map(r => r.year);
  }
}
export const dashboardService = new DashboardService();
