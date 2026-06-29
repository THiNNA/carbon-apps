import { prisma } from '../../common/database/prisma.js';
import { CreateEmissionFactorDto } from '@enterprise/shared-types';

export class EmissionFactorRepository {
  async listGroups() {
    const groups = await prisma.emissionFactor.groupBy({
      by: ['year', 'organizationId'],
      _count: {
        id: true
      },
      _max: {
        updatedAt: true
      }
    });

    const result = [];
    for (const g of groups) {
      const org = await prisma.organization.findUnique({
        where: { id: g.organizationId }
      });
      result.push({
        year: g.year,
        organizationId: g.organizationId,
        organizationName: org ? org.name : 'Unknown Organization',
        organizationCode: org ? org.code : 'UNKNOWN',
        isSystem: org ? org.isSystem : false,
        count: g._count.id,
        updatedAt: g._max.updatedAt
      });
    }

    return result.sort((a, b) => b.year - a.year || a.organizationName.localeCompare(b.organizationName));
  }

  async getSystemOrgId(): Promise<string | null> {
    const systemOrg = await prisma.organization.findFirst({
      where: { code: 'SYSTEM', isSystem: true }
    });
    return systemOrg ? systemOrg.id : null;
  }

  async list(year?: number, organizationId?: string) {
    const where: any = {};
    if (year !== undefined) {
      where.year = year;
    }
    if (organizationId !== undefined) {
      where.organizationId = organizationId;
    }
    return prisma.emissionFactor.findMany({
      where,
      orderBy: [{ year: 'desc' }, { category: 'asc' }, { key: 'asc' }]
    });
  }

  async findByYearAndKey(year: number, key: string, organizationId: string) {
    return prisma.emissionFactor.findFirst({
      where: { year, key, organizationId }
    });
  }

  async findById(id: string) {
    return prisma.emissionFactor.findFirst({
      where: { id }
    });
  }

  async update(id: string, data: { name?: string; value?: number; unit?: string; source?: string | null; sourceUrl?: string | null }, userId?: string) {
    return prisma.emissionFactor.update({
      where: { id },
      data: { ...data, updatedBy: userId }
    });
  }

  async bulkUpdate(year: number, organizationId: string, factors: Array<{ key: string; value: number }>, userId?: string) {
    return prisma.$transaction(
      factors.map(f =>
        prisma.emissionFactor.updateMany({
          where: { year, key: f.key, organizationId },
          data: {
            value: f.value,
            updatedBy: userId
          }
        })
      )
    );
  }

  async clone(fromYear: number, fromOrgId: string, toYear: number, toOrgId: string, userId?: string) {
    // 1. Fetch factors from source year & org
    const sourceFactors = await prisma.emissionFactor.findMany({
      where: { year: fromYear, organizationId: fromOrgId }
    });

    if (sourceFactors.length === 0) {
      throw new Error(`ไม่พบข้อมูลตั้งค่าสูตรคำนวณของปีฐานและองค์กรที่ระบุ`);
    }

    // 2. Insert/Upsert into target year & org
    const operations = sourceFactors.map(sf => {
      const data = {
        category: sf.category,
        name: sf.name,
        value: sf.value,
        unit: sf.unit,
        source: sf.source,
        sourceUrl: sf.sourceUrl,
        createdBy: userId
      };

      return prisma.emissionFactor.upsert({
        where: {
          year_key_organizationId: {
            year: toYear,
            key: sf.key,
            organizationId: toOrgId
          }
        },
        update: {
          category: sf.category,
          name: sf.name,
          value: sf.value,
          unit: sf.unit,
          source: sf.source,
          sourceUrl: sf.sourceUrl,
          updatedBy: userId
        },
        create: {
          year: toYear,
          key: sf.key,
          organizationId: toOrgId,
          ...data
        }
      });
    });

    return prisma.$transaction(operations);
  }

  async create(data: CreateEmissionFactorDto & { organizationId: string }, userId?: string) {
    return prisma.emissionFactor.upsert({
      where: {
        year_key_organizationId: {
          year: data.year,
          key: data.key,
          organizationId: data.organizationId
        }
      },
      update: {
        category: data.category,
        name: data.name,
        value: data.value,
        unit: data.unit,
        source: data.source,
        sourceUrl: data.sourceUrl,
        updatedBy: userId
      },
      create: {
        year: data.year,
        category: data.category,
        key: data.key,
        name: data.name,
        value: data.value,
        unit: data.unit,
        organizationId: data.organizationId,
        source: data.source,
        sourceUrl: data.sourceUrl,
        createdBy: userId
      }
    });
  }

  async initialize(year: number, organizationId: string, userId?: string) {
    const defaultFactors = [
      // ─── Scope 1: Stationary Combustion ─────────────────────────────
      {
        category: 'scope1', key: 's1StationaryDiesel',
        name: 'น้ำมันดีเซลสำหรับเครื่องจักร', value: 2.7078, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1StationaryGasoline',
        name: 'น้ำมันเบนซินสำหรับเครื่องจักร', value: 2.1894, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1CookingLpg',
        name: 'แก๊สหุงต้ม LPG', value: 3.1134, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      // ─── Scope 1: Mobile Combustion ────────────────────────────────
      {
        category: 'scope1', key: 's1VehicleDiesel',
        name: 'น้ำมันดีเซลสำหรับยานพาหนะ', value: 2.7406, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1VehicleGasoline',
        name: 'น้ำมันเบนซินสำหรับยานพาหนะ', value: 2.2394, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1VehicleCng',
        name: 'ก๊าซธรรมชาติ CNG สำหรับยานพาหนะ', value: 2.2609, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      // ─── Scope 1: Fugitive — Fire Extinguisher ─────────────────────
      {
        category: 'scope1', key: 's1FireExtCo2',
        name: 'ถังดับเพลิง CO2', value: 1.0000, unit: 'kgCO2e/กก.',
        source: 'IPCC AR5 — Global Warming Potential (GWP100): CO2 = 1',
        sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/'
      },
      // ─── Scope 1: Fugitive — Refrigerants ─────────────────────────
      {
        category: 'scope1', key: 's1RefrigHfc134a',
        name: 'สารทำความเย็น HFC-134a', value: 1300.0000, unit: 'kgCO2e/กก.',
        source: 'IPCC AR5 — Global Warming Potential (GWP100): HFC-134a = 1,300',
        sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/'
      },
      {
        category: 'scope1', key: 's1RefrigR22',
        name: 'สารทำความเย็น R22', value: 1760.0000, unit: 'kgCO2e/กก.',
        source: 'IPCC AR5 — Global Warming Potential (GWP100): HCFC-22 = 1,760',
        sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/'
      },
      // ─── Scope 1: Fugitive — Anesthesia ───────────────────────────
      {
        category: 'scope1', key: 's1AnesthesiaN2o',
        name: 'ยาสลบไนตรัสออกไซด์ (N2O)', value: 0.3249, unit: 'kgCO2e/มล.',
        source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012), IPCC AR5 N2O GWP = 265',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/'
      },
      {
        category: 'scope1', key: 's1AnesthesiaIsoflur',
        name: 'ยาสลบ Isoflurane', value: 0.8160, unit: 'kgCO2e/มล.',
        source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/'
      },
      {
        category: 'scope1', key: 's1AnesthesiaDesflu',
        name: 'ยาสลบ Desflurane', value: 3.6805, unit: 'kgCO2e/มล.',
        source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/'
      },
      {
        category: 'scope1', key: 's1AnesthesiaSevoflur',
        name: 'ยาสลบ Sevoflurane', value: 0.2196, unit: 'kgCO2e/มล.',
        source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)',
        sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/'
      },
      // ─── Scope 1: Internal Waste ───────────────────────────────────
      {
        category: 'scope1', key: 's1InfWasteAutoclave',
        name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายใน', value: 0.2430, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1OrganicWasteFerment',
        name: 'ขยะอินทรีย์หมักภายใน', value: 0.3338, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope1', key: 's1OrganicWasteCompost',
        name: 'ขยะอินทรีย์ปุ๋ยหมักภายใน', value: 0.1102, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      // ─── Scope 2: Electricity ─────────────────────────────────────
      {
        category: 'scope2', key: 's2Electricity',
        name: 'การใช้ไฟฟ้ากระแสไฟฟ้า', value: 0.5781, unit: 'kgCO2e/kWh',
        source: 'กฟผ. / อบก. — ค่า Grid Emission Factor ไฟฟ้าจากระบบสายส่ง (ประเทศไทย)',
        sourceUrl: 'https://www.egat.co.th/index.php?option=com_content&view=article&id=5&Itemid=117'
      },
      // ─── Scope 3: Water & Resources ───────────────────────────────
      {
        category: 'scope3', key: 's3Water',
        name: 'การใช้น้ำประปา', value: 0.5411, unit: 'kgCO2e/ลบ.ม.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการใช้น้ำประปา',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3PaperA4',
        name: 'การเบิกกระดาษ A4', value: 5.2540, unit: 'kgCO2e/รีม',
        source: 'GHG Protocol — Paper Supply Chain Emission Factor',
        sourceUrl: 'https://ghgprotocol.org/scope-3-technical-calculation-guidance'
      },
      {
        category: 'scope3', key: 's3PlasticBag',
        name: 'การใช้ถุงขยะพลาสติก', value: 6.7070, unit: 'kgCO2e/กก.',
        source: 'DEFRA UK — Conversion Factors for Plastic Products',
        sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023'
      },
      // ─── Scope 3: Outsourced Transport ─────────────────────────────
      {
        category: 'scope3', key: 's3OutsourceDiesel',
        name: 'น้ำมันดีเซลจ้างเหมาขนส่ง', value: 2.7406, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3OutsourceGasoline',
        name: 'น้ำมันเบนซินจ้างเหมาขนส่ง', value: 2.2394, unit: 'kgCO2e/ลิตร',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      // ─── Scope 3: External Waste ──────────────────────────────────
      {
        category: 'scope3', key: 's3GeneralWasteLandfill',
        name: 'ขยะทั่วไปฝังกลบภายนอก', value: 0.5000, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ / IPCC Waste',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3HazardousWasteLandfill',
        name: 'ขยะอันตรายฝังกลบภายนอก', value: 0.5000, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3HazardousWasteIncin',
        name: 'ขยะอันตรายเผาภายนอก', value: 0.5000, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3InfWasteIncin',
        name: 'ขยะติดเชื้อเผาภายนอก', value: 0.5000, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'scope3', key: 's3InfWasteAutoclaveExt',
        name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายนอก', value: 0.2430, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      // ─── Scope 3: Business Travel ─────────────────────────────────
      {
        category: 'scope3', key: 's3TravelCar',
        name: 'การเดินทางด้วยรถยนต์ส่วนตัว/องค์กร', value: 0.1680, unit: 'kgCO2e/กม.',
        source: 'DEFRA UK — GHG Conversion Factors for Company Reporting (Car)',
        sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023'
      },
      {
        category: 'scope3', key: 's3TravelPlane',
        name: 'การเดินทางด้วยเครื่องบินชั้นประหยัด', value: 0.1539, unit: 'kgCO2e/กม.',
        source: 'DEFRA UK — GHG Conversion Factors for Company Reporting (Domestic/Short-haul Economy)',
        sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023'
      },
      // ─── Reduction ────────────────────────────────────────────────
      {
        category: 'reduction', key: 'compostFoodWaste',
        name: 'ปุ๋ยหมักเศษอาหาร', value: 0.4300, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าการลดการปล่อยก๊าซเรือนกระจกจากการทำปุ๋ยหมัก',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'reduction', key: 'compostLeafBranch',
        name: 'ปุ๋ยหมักกิ่งไม้ใบไม้', value: 0.1102, unit: 'kgCO2e/กก.',
        source: 'อบก. — ค่าการลดการปล่อยก๊าซเรือนกระจกจากการทำปุ๋ยหมัก',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      },
      {
        category: 'reduction', key: 'solarElectricity',
        name: 'การผลิตไฟฟ้า Solar Cell', value: 0.5781, unit: 'kgCO2e/kWh',
        source: 'กฟผ. / อบก. — ค่า Grid Emission Factor (ใช้ค่าเดียวกับไฟฟ้า Scope 2)',
        sourceUrl: 'https://www.egat.co.th/index.php?option=com_content&view=article&id=5&Itemid=117'
      },
      {
        category: 'reduction', key: 'treePerYear',
        name: 'การดูดกลับคาร์บอนของไม้ยืนต้น', value: 3.6700, unit: 'kgCO2e/ต้น/ปี',
        source: 'อบก. — ค่าการดูดกลับก๊าซคาร์บอนไดออกไซด์ของต้นไม้ในประเทศไทย',
        sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/'
      }
    ];

    const operations = defaultFactors.map(factor =>
      prisma.emissionFactor.upsert({
        where: {
          year_key_organizationId: {
            year,
            key: factor.key,
            organizationId
          }
        },
        update: {
          category: factor.category,
          name: factor.name,
          value: factor.value,
          unit: factor.unit,
          source: (factor as any).source ?? null,
          sourceUrl: (factor as any).sourceUrl ?? null
        },
        create: {
          year,
          category: factor.category,
          key: factor.key,
          name: factor.name,
          value: factor.value,
          unit: factor.unit,
          organizationId,
          source: (factor as any).source ?? null,
          sourceUrl: (factor as any).sourceUrl ?? null,
          createdBy: userId
        }
      })
    );

    return prisma.$transaction(operations);
  }

  async deleteByYearAndOrg(year: number, organizationId: string, userId?: string) {
    return prisma.emissionFactor.deleteMany({
      where: { year, organizationId }
    });
  }
}

export const emissionFactorRepository = new EmissionFactorRepository();
