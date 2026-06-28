import { prisma } from '../../common/database/prisma.js';
import { DashboardStatsDto, UserDto, TokenPayload, CarbonDashboardStatsDto } from '@enterprise/shared-types';
import { EF, EF_REDUCTION } from '../carbon-records/service.js';

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
      activeSessionsCount: 3, // Mock active sessions count
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

    const records = await prisma.carbonRecord.findMany({
      where,
      include: { department: { include: { organization: true } } }
    });

    const initSummary = (yr: number) => ({
      year: yr,
      emission: 0,
      reduction: 0,
      removal: 0,
      net: 0,
      scope1: 0,
      scope2: 0,
      scope3: 0
    });

    const initBreakdown = () => ({
      scope1: {
        stationary: 0,
        mobile: 0,
        fugitive: 0,
        waste: 0,
        wastewater: 0
      },
      scope2: {
        electricity: 0
      },
      scope3: {
        resources: 0,
        outsourcedFuel: 0,
        externalWaste: 0,
        travel: 0
      }
    });

    const summary = {
      baseYear: initSummary(filter.baseYear),
      currentYear: initSummary(filter.year)
    };

    const scopeBreakdown = {
      baseYear: initBreakdown(),
      currentYear: initBreakdown()
    };

    const activitiesMap: Record<string, number> = {
      'การใช้ไฟฟ้า': 0,
      'การใช้น้ำมันดีเซลสำหรับยานพาหนะ': 0,
      'การบำบัดน้ำเสีย': 0,
      'การเบิกกระดาษ A4': 0,
      'การใช้ถุงขยะพลาสติก': 0,
      'การใช้น้ำประปา': 0,
      'การใช้น้ำมันดีเซลสำหรับเครื่องจักร': 0,
      'การใช้น้ำมันเบนซินสำหรับเครื่องจักร': 0,
      'การใช้แก๊สหุงต้ม': 0,
      'การใช้น้ำมันเบนซินสำหรับยานพาหนะ': 0,
      'การใช้ CNG สำหรับยานพาหนะ': 0,
      'ถังดับเพลิง CO2': 0,
      'การใช้สารทำความเย็น HFC-134a': 0,
      'การใช้สารทำความเย็น R22': 0,
      'ยาสลบไนตรัสออกไซด์ (N2O)': 0,
      'ยาสลบ Isoflurane': 0,
      'ยาสลบ Desflurane': 0,
      'ยาสลบ Sevoflurane': 0,
      'มูลฝอยติดเชื้อภายใน (Autoclave)': 0,
      'ขยะอินทรีย์หมักภายใน': 0,
      'ขยะอินทรีย์ปุ๋ยหมักภายใน': 0,
      'การใช้น้ำมันดีเซลจ้างเหมา': 0,
      'การใช้น้ำมันเบนซินจ้างเหมา': 0,
      'มูลฝอยทั่วไปภายนอก (ฝังกลบ)': 0,
      'มูลฝอยอันตรายภายนอก (ฝังกลบ)': 0,
      'มูลฝอยอันตรายภายนอก (เผา)': 0,
      'มูลฝอยติดเชื้อภายนอก (เผา)': 0,
      'มูลฝอยติดเชื้อภายนอก (Autoclave)': 0,
      'การเดินทางโดยรถยนต์': 0,
      'การเดินทางโดยเครื่องบิน': 0
    };

    for (const r of records) {
      const isCurrent = r.year === filter.year;
      const targetSum = isCurrent ? summary.currentYear : summary.baseYear;
      const targetBreakdown = isCurrent ? scopeBreakdown.currentYear : scopeBreakdown.baseYear;

      // Sum metrics
      targetSum.emission += r.totalCo2e || 0;
      targetSum.scope1 += r.scope1Co2e || 0;
      targetSum.scope2 += r.scope2Co2e || 0;
      targetSum.scope3 += r.scope3Co2e || 0;

      // Removal (trees)
      const monthlyRemoval = (r.redTreeCount || 0) * (EF_REDUCTION.treePerYear / 12);
      targetSum.removal += monthlyRemoval;

      // Reduction (totalReduced - removal)
      const monthlyTotalReduced = r.totalReducedCo2e || 0;
      targetSum.reduction += Math.max(0, monthlyTotalReduced - monthlyRemoval);

      targetSum.net += r.netCo2e || 0;

      // Subcategory breakdowns
      const stationary =
        (r.s1StationaryDieselLiters || 0) * EF.s1StationaryDiesel +
        (r.s1StationaryGasolineLiters || 0) * EF.s1StationaryGasoline +
        (r.s1CookingLpgKg || 0) * EF.s1CookingLpg;

      const mobile =
        (r.s1VehicleDieselLiters || 0) * EF.s1VehicleDiesel +
        (r.s1VehicleGasolineLiters || 0) * EF.s1VehicleGasoline +
        (r.s1VehicleCngKg || 0) * EF.s1VehicleCng;

      const fugitive =
        (r.s1FireExtCo2Kg || 0) * EF.s1FireExtCo2 +
        (r.s1RefrigHfc134aKg || 0) * EF.s1RefrigHfc134a +
        (r.s1RefrigR22Kg || 0) * EF.s1RefrigR22 +
        (r.s1AnesthesiaN2oMl || 0) * EF.s1AnesthesiaN2o +
        (r.s1AnesthesiaIsoflurMl || 0) * EF.s1AnesthesiaIsoflur +
        (r.s1AnesthesiaDesfluMl || 0) * EF.s1AnesthesiaDesflu +
        (r.s1AnesthesiaSevoflurMl || 0) * EF.s1AnesthesiaSevoflur;

      const waste =
        (r.s1InfWasteAutoclaveKg || 0) * EF.s1InfWasteAutoclave +
        (r.s1OrganicWasteFermentKg || 0) * EF.s1OrganicWasteFerment +
        (r.s1OrganicWasteCompostKg || 0) * EF.s1OrganicWasteCompost;

      const wastewater =
        (5 * (r.s1WastewaterWaterM3 || 0) * ((r.s1WastewaterCodAnaerobicShallow || 0) / 1000)) +
        (20 * (r.s1WastewaterWaterM3 || 0) * ((r.s1WastewaterCodAnaerobicDeep || 0) / 1000));

      targetBreakdown.scope1.stationary += stationary;
      targetBreakdown.scope1.mobile += mobile;
      targetBreakdown.scope1.fugitive += fugitive;
      targetBreakdown.scope1.waste += waste;
      targetBreakdown.scope1.wastewater += wastewater;

      // Scope 2
      const electricity = (r.s2ElectricityKwh || 0) * EF.s2Electricity;
      targetBreakdown.scope2.electricity += electricity;

      // Scope 3
      const resources =
        (r.s3WaterCubicM || 0) * EF.s3Water +
        (r.s3PaperA4Reams || 0) * EF.s3PaperA4 +
        (r.s3PlasticBagKg || 0) * EF.s3PlasticBag;

      const outsourcedFuel =
        (r.s3OutsourceDieselLiters || 0) * EF.s3OutsourceDiesel +
        (r.s3OutsourceGasolineLiters || 0) * EF.s3OutsourceGasoline;

      const externalWaste =
        (r.s3GeneralWasteKg || 0) * EF.s3GeneralWasteLandfill +
        (r.s3HazardousWasteLandfillKg || 0) * EF.s3HazardousWasteLandfill +
        (r.s3HazardousWasteIncinKg || 0) * EF.s3HazardousWasteIncin +
        (r.s3InfWasteIncinKg || 0) * EF.s3InfWasteIncin +
        (r.s3InfWasteAutoclaveExtKg || 0) * EF.s3InfWasteAutoclaveExt;

      const travel =
        (r.s3TravelCarKm || 0) * EF.s3TravelCar +
        (r.s3TravelPlaneKm || 0) * EF.s3TravelPlane;

      targetBreakdown.scope3.resources += resources;
      targetBreakdown.scope3.outsourcedFuel += outsourcedFuel;
      targetBreakdown.scope3.externalWaste += externalWaste;
      targetBreakdown.scope3.travel += travel;

      if (isCurrent) {
        activitiesMap['การใช้ไฟฟ้า'] += electricity;
        activitiesMap['การใช้น้ำมันดีเซลสำหรับยานพาหนะ'] += (r.s1VehicleDieselLiters || 0) * EF.s1VehicleDiesel;
        activitiesMap['การบำบัดน้ำเสีย'] += wastewater;
        activitiesMap['การเบิกกระดาษ A4'] += (r.s3PaperA4Reams || 0) * EF.s3PaperA4;
        activitiesMap['การใช้ถุงขยะพลาสติก'] += (r.s3PlasticBagKg || 0) * EF.s3PlasticBag;
        activitiesMap['การใช้น้ำประปา'] += (r.s3WaterCubicM || 0) * EF.s3Water;
        activitiesMap['การใช้น้ำมันดีเซลสำหรับเครื่องจักร'] += (r.s1StationaryDieselLiters || 0) * EF.s1StationaryDiesel;
        activitiesMap['การใช้น้ำมันเบนซินสำหรับเครื่องจักร'] += (r.s1StationaryGasolineLiters || 0) * EF.s1StationaryGasoline;
        activitiesMap['การใช้แก๊สหุงต้ม'] += (r.s1CookingLpgKg || 0) * EF.s1CookingLpg;
        activitiesMap['การใช้น้ำมันเบนซินสำหรับยานพาหนะ'] += (r.s1VehicleGasolineLiters || 0) * EF.s1VehicleGasoline;
        activitiesMap['การใช้ CNG สำหรับยานพาหนะ'] += (r.s1VehicleCngKg || 0) * EF.s1VehicleCng;
        activitiesMap['ถังดับเพลิง CO2'] += (r.s1FireExtCo2Kg || 0) * EF.s1FireExtCo2;
        activitiesMap['การใช้สารทำความเย็น HFC-134a'] += (r.s1RefrigHfc134aKg || 0) * EF.s1RefrigHfc134a;
        activitiesMap['การใช้สารทำความเย็น R22'] += (r.s1RefrigR22Kg || 0) * EF.s1RefrigR22;
        activitiesMap['ยาสลบไนตรัสออกไซด์ (N2O)'] += (r.s1AnesthesiaN2oMl || 0) * EF.s1AnesthesiaN2o;
        activitiesMap['ยาสลบ Isoflurane'] += (r.s1AnesthesiaIsoflurMl || 0) * EF.s1AnesthesiaIsoflur;
        activitiesMap['ยาสลบ Desflurane'] += (r.s1AnesthesiaDesfluMl || 0) * EF.s1AnesthesiaDesflu;
        activitiesMap['ยาสลบ Sevoflurane'] += (r.s1AnesthesiaSevoflurMl || 0) * EF.s1AnesthesiaSevoflur;
        activitiesMap['มูลฝอยติดเชื้อภายใน (Autoclave)'] += (r.s1InfWasteAutoclaveKg || 0) * EF.s1InfWasteAutoclave;
        activitiesMap['ขยะอินทรีย์หมักภายใน'] += (r.s1OrganicWasteFermentKg || 0) * EF.s1OrganicWasteFerment;
        activitiesMap['ขยะอินทรีย์ปุ๋ยหมักภายใน'] += (r.s1OrganicWasteCompostKg || 0) * EF.s1OrganicWasteCompost;
        activitiesMap['การใช้น้ำมันดีเซลจ้างเหมา'] += (r.s3OutsourceDieselLiters || 0) * EF.s3OutsourceDiesel;
        activitiesMap['การใช้น้ำมันเบนซินจ้างเหมา'] += (r.s3OutsourceGasolineLiters || 0) * EF.s3OutsourceGasoline;
        activitiesMap['มูลฝอยทั่วไปภายนอก (ฝังกลบ)'] += (r.s3GeneralWasteKg || 0) * EF.s3GeneralWasteLandfill;
        activitiesMap['มูลฝอยอันตรายภายนอก (ฝังกลบ)'] += (r.s3HazardousWasteLandfillKg || 0) * EF.s3HazardousWasteLandfill;
        activitiesMap['มูลฝอยอันตรายภายนอก (เผา)'] += (r.s3HazardousWasteIncinKg || 0) * EF.s3HazardousWasteIncin;
        activitiesMap['มูลฝอยติดเชื้อภายนอก (เผา)'] += (r.s3InfWasteIncinKg || 0) * EF.s3InfWasteIncin;
        activitiesMap['มูลฝอยติดเชื้อภายนอก (Autoclave)'] += (r.s3InfWasteAutoclaveExtKg || 0) * EF.s3InfWasteAutoclaveExt;
        activitiesMap['การเดินทางโดยรถยนต์'] += (r.s3TravelCarKm || 0) * EF.s3TravelCar;
        activitiesMap['การเดินทางโดยเครื่องบิน'] += (r.s3TravelPlaneKm || 0) * EF.s3TravelPlane;
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

    return {
      summary,
      scopeBreakdown,
      topActivities
    };
  }
}
export const dashboardService = new DashboardService();

