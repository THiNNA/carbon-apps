import { carbonRecordRepository } from './repository.js';
import { CarbonRecordDto, CreateCarbonRecordDto, UpdateCarbonRecordDto } from '@enterprise/shared-types';
import { BadRequestError, NotFoundError } from '../../common/errors/custom-errors.js';
import { prisma } from '../../common/database/prisma.js';

// =====================================================================
// Thai Emission Factors (kgCO2e per unit) — มาตรฐานประเทศไทย / IPCC
// =====================================================================
export const EF = {
  // Scope 1: Stationary Combustion
  s1StationaryDiesel:   2.7078,
  s1StationaryGasoline: 2.1894,
  s1CookingLpg:         3.1134,
  // Scope 1: Mobile Combustion
  s1VehicleDiesel:   2.7406,
  s1VehicleGasoline: 2.2394,
  s1VehicleCng:      2.2609,
  // Scope 1: Fugitive
  s1FireExtCo2:      1.0,
  s1RefrigHfc134a:   1300,
  s1RefrigR22:       1760,
  // Anesthetic gases (kgCO2e/ml, density-adjusted)
  s1AnesthesiaN2o:      0.3249,  // 265 kgCO2e/kg × 1.226 g/ml / 1000
  s1AnesthesiaIsoflur:  0.8160,  // 539 × 1.514 g/ml / 1000
  s1AnesthesiaDesflu:   3.6805,  // 2540 × 1.449 g/ml / 1000
  s1AnesthesiaSevoflur: 0.2196,  // 144 × 1.525 g/ml / 1000
  // Scope 1: Internal Waste
  s1InfWasteAutoclave:   0.243,
  s1OrganicWasteFerment: 0.3338,
  s1OrganicWasteCompost: 0.1102,
  // Scope 2
  s2Electricity: 0.5781,
  // Scope 3: Resources
  s3Water:       0.5411,
  s3PaperA4:     5.254,
  s3PlasticBag:  6.707,
  // Scope 3: Outsourced fuel
  s3OutsourceDiesel:   2.7406,
  s3OutsourceGasoline: 2.2394,
  // Scope 3: External waste disposal
  s3GeneralWasteLandfill:   0.50,
  s3HazardousWasteLandfill: 0.50,
  s3HazardousWasteIncin:    0.50,
  s3InfWasteIncin:          0.50,
  s3InfWasteAutoclaveExt:   0.243,
  // Scope 3: Travel
  s3TravelCar:   0.168,
  s3TravelPlane: 0.1539,
};

// Reduction activity emission factors (kgCO2e avoided per unit)
export const EF_REDUCTION = {
  compostFoodWaste:  0.43,
  compostLeafBranch: 0.11,
  solarElectricity:  0.5781,
  treePerYear:       3.67,
};

function calcScope1(d: any, ef: any): number {
  const wastewaterAnaerobicCo2e =
    (5 * (d.s1WastewaterWaterM3 ?? 0) * ((d.s1WastewaterCodAnaerobicShallow ?? 0) / 1000)) +
    (20 * (d.s1WastewaterWaterM3 ?? 0) * ((d.s1WastewaterCodAnaerobicDeep ?? 0) / 1000));

  return (
    (d.s1StationaryDieselLiters   ?? 0) * ef.s1StationaryDiesel +
    (d.s1StationaryGasolineLiters ?? 0) * ef.s1StationaryGasoline +
    (d.s1CookingLpgKg             ?? 0) * ef.s1CookingLpg +
    (d.s1VehicleDieselLiters      ?? 0) * ef.s1VehicleDiesel +
    (d.s1VehicleGasolineLiters    ?? 0) * ef.s1VehicleGasoline +
    (d.s1VehicleCngKg             ?? 0) * ef.s1VehicleCng +
    (d.s1FireExtCo2Kg             ?? 0) * ef.s1FireExtCo2 +
    (d.s1RefrigHfc134aKg          ?? 0) * ef.s1RefrigHfc134a +
    (d.s1RefrigR22Kg              ?? 0) * ef.s1RefrigR22 +
    (d.s1AnesthesiaN2oMl          ?? 0) * ef.s1AnesthesiaN2o +
    (d.s1AnesthesiaIsoflurMl      ?? 0) * ef.s1AnesthesiaIsoflur +
    (d.s1AnesthesiaDesfluMl       ?? 0) * ef.s1AnesthesiaDesflu +
    (d.s1AnesthesiaSevoflurMl     ?? 0) * ef.s1AnesthesiaSevoflur +
    (d.s1InfWasteAutoclaveKg      ?? 0) * ef.s1InfWasteAutoclave +
    (d.s1OrganicWasteFermentKg    ?? 0) * ef.s1OrganicWasteFerment +
    (d.s1OrganicWasteCompostKg    ?? 0) * ef.s1OrganicWasteCompost +
    wastewaterAnaerobicCo2e
  );
}

function calcScope2(d: any, ef: any): number {
  return (d.s2ElectricityKwh ?? 0) * ef.s2Electricity;
}

function calcScope3(d: any, ef: any): number {
  return (
    (d.s3WaterCubicM              ?? 0) * ef.s3Water +
    (d.s3PaperA4Reams             ?? 0) * ef.s3PaperA4 +
    (d.s3PlasticBagKg             ?? 0) * ef.s3PlasticBag +
    (d.s3OutsourceDieselLiters    ?? 0) * ef.s3OutsourceDiesel +
    (d.s3OutsourceGasolineLiters  ?? 0) * ef.s3OutsourceGasoline +
    (d.s3GeneralWasteKg           ?? 0) * ef.s3GeneralWasteLandfill +
    (d.s3HazardousWasteLandfillKg ?? 0) * ef.s3HazardousWasteLandfill +
    (d.s3HazardousWasteIncinKg    ?? 0) * ef.s3HazardousWasteIncin +
    (d.s3InfWasteIncinKg          ?? 0) * ef.s3InfWasteIncin +
    (d.s3InfWasteAutoclaveExtKg   ?? 0) * ef.s3InfWasteAutoclaveExt +
    (d.s3TravelCarKm              ?? 0) * ef.s3TravelCar +
    (d.s3TravelPlaneKm            ?? 0) * ef.s3TravelPlane
  );
}

function calcReduction(d: any, ef: any, efRed: any): number {
  let solarKwh = d.redSolarMeteredKwh ?? 0;
  if (!d.redSolarHasMeter && (d.redSolarPanelWatts ?? 0) > 0) {
    solarKwh = ((d.redSolarPanelWatts ?? 0) * (d.redSolarPanelCount ?? 0) * (d.redSolarDays ?? 0) * 4) / 1000;
  }
  const solarNet = Math.max(0, solarKwh - (d.redSolarUsedKwh ?? 0));
  return (
    (d.redCompostFoodWasteKg  ?? 0) * efRed.compostFoodWaste +
    (d.redCompostLeafBranchKg ?? 0) * efRed.compostLeafBranch +
    solarNet * efRed.solarElectricity +
    (d.redTreeCount ?? 0) * (efRed.treePerYear / 12) +
    (d.redTelemedicineCo2e ?? 0) +
    (d.redOtherCo2e ?? 0)
  );
}

function calculateAll(d: any, ef: any, efRed: any) {
  const scope1Co2e = calcScope1(d, ef);
  const scope2Co2e = calcScope2(d, ef);
  const scope3Co2e = calcScope3(d, ef);
  const totalCo2e = scope1Co2e + scope2Co2e + scope3Co2e;
  const totalReducedCo2e = calcReduction(d, ef, efRed);
  const netCo2e = totalCo2e - totalReducedCo2e;
  return { scope1Co2e, scope2Co2e, scope3Co2e, totalCo2e, totalReducedCo2e, netCo2e };
}

async function loadFactorsForYear(year: number) {
  const dbFactors = await prisma.emissionFactor.findMany({
    where: { year }
  });

  const ef = { ...EF };
  const efRed = { ...EF_REDUCTION };

  for (const f of dbFactors) {
    if (f.category === 'reduction') {
      if (f.key in efRed) {
        (efRed as any)[f.key] = f.value;
      }
    } else {
      if (f.key in ef) {
        (ef as any)[f.key] = f.value;
      }
    }
  }

  return { ef, efRed };
}

function toDto(record: any): CarbonRecordDto {
  return {
    id: record.id,
    departmentId: record.departmentId,
    department: record.department
      ? {
          id: record.department.id,
          code: record.department.code,
          name: record.department.name,
          description: record.department.description,
          organizationId: record.department.organizationId,
          organization: record.department.organization ?? null,
          createdAt: record.department.createdAt,
          updatedAt: record.department.updatedAt,
          deletedAt: record.department.deletedAt,
          createdBy: record.department.createdBy,
          updatedBy: record.department.updatedBy,
          deletedBy: record.department.deletedBy,
        }
      : null,
    year: record.year,
    month: record.month,
    s1StationaryDieselLiters:   record.s1StationaryDieselLiters,
    s1StationaryGasolineLiters: record.s1StationaryGasolineLiters,
    s1CookingLpgKg:             record.s1CookingLpgKg,
    s1VehicleDieselLiters:      record.s1VehicleDieselLiters,
    s1VehicleGasolineLiters:    record.s1VehicleGasolineLiters,
    s1VehicleCngKg:             record.s1VehicleCngKg,
    s1FireExtCo2Kg:             record.s1FireExtCo2Kg,
    s1RefrigHfc134aKg:          record.s1RefrigHfc134aKg,
    s1RefrigR22Kg:              record.s1RefrigR22Kg,
    s1AnesthesiaN2oMl:          record.s1AnesthesiaN2oMl,
    s1AnesthesiaIsoflurMl:      record.s1AnesthesiaIsoflurMl,
    s1AnesthesiaDesfluMl:       record.s1AnesthesiaDesfluMl,
    s1AnesthesiaSevoflurMl:     record.s1AnesthesiaSevoflurMl,
    s1InfWasteAutoclaveKg:      record.s1InfWasteAutoclaveKg,
    s1OrganicWasteFermentKg:    record.s1OrganicWasteFermentKg,
    s1OrganicWasteCompostKg:    record.s1OrganicWasteCompostKg,
    s1WastewaterWaterM3:             record.s1WastewaterWaterM3,
    s1WastewaterCodAnaerobicShallow: record.s1WastewaterCodAnaerobicShallow,
    s1WastewaterCodAnaerobicDeep:    record.s1WastewaterCodAnaerobicDeep,
    s1WastewaterCodAerobic:          record.s1WastewaterCodAerobic,
    s2ElectricityKwh:           record.s2ElectricityKwh,
    s3WaterCubicM:              record.s3WaterCubicM,
    s3DetergentPowderKg:        record.s3DetergentPowderKg,
    s3LaundryLiquidMl:          record.s3LaundryLiquidMl,
    s3TonerCartridges:          record.s3TonerCartridges,
    s3PaperA4Reams:             record.s3PaperA4Reams,
    s3PlasticBagKg:             record.s3PlasticBagKg,
    s3GlovesLatexDlcsfogPcs:    record.s3GlovesLatexDlcsfogPcs,
    s3GlovesLatexDrofsogPcs:    record.s3GlovesLatexDrofsogPcs,
    s3GlovesNitrileEafPcs:      record.s3GlovesNitrileEafPcs,
    s3GlovesNitrileDvbPcs:      record.s3GlovesNitrileDvbPcs,
    s3GlovesLatexDfofsogPcs:    record.s3GlovesLatexDfofsogPcs,
    s3GlovesLatexDlxfbogPcs:    record.s3GlovesLatexDlxfbogPcs,
    s3GlovesNitrileVbuPcs:      record.s3GlovesNitrileVbuPcs,
    s3MasksBoxes:               record.s3MasksBoxes,
    s3Amlodipine5mgBoxes:       record.s3Amlodipine5mgBoxes,
    s3Amlodipine10mgBoxes:      record.s3Amlodipine10mgBoxes,
    s3Deferiprone500mgBottles:  record.s3Deferiprone500mgBottles,
    s3Gabapentin100mgBoxes:     record.s3Gabapentin100mgBoxes,
    s3Gabapentin300mgBoxes:     record.s3Gabapentin300mgBoxes,
    s3Omeprazole20mgBoxes:      record.s3Omeprazole20mgBoxes,
    s3AlcoholMl:                record.s3AlcoholMl,
    s3AmmoniaMl:                record.s3AmmoniaMl,
    s3NaohKg:                   record.s3NaohKg,
    s3AlumKg:                   record.s3AlumKg,
    s3SulfuricAcidKg:           record.s3SulfuricAcidKg,
    s3LimeKg:                   record.s3LimeKg,
    s3ChlorineKg:               record.s3ChlorineKg,
    s3OutsourceDieselLiters:    record.s3OutsourceDieselLiters,
    s3OutsourceGasolineLiters:  record.s3OutsourceGasolineLiters,
    s3GeneralWasteKg:           record.s3GeneralWasteKg,
    s3HazardousWasteLandfillKg: record.s3HazardousWasteLandfillKg,
    s3HazardousWasteIncinKg:    record.s3HazardousWasteIncinKg,
    s3InfWasteIncinKg:          record.s3InfWasteIncinKg,
    s3InfWasteAutoclaveExtKg:   record.s3InfWasteAutoclaveExtKg,
    s3TravelCarKm:              record.s3TravelCarKm,
    s3TravelPlaneKm:            record.s3TravelPlaneKm,
    redRecycledPaperKg:         record.redRecycledPaperKg,
    redRecycledAluminumKg:      record.redRecycledAluminumKg,
    redRecycledPlasticKg:       record.redRecycledPlasticKg,
    redRecycledIronKg:          record.redRecycledIronKg,
    redRecycledMetalKg:         record.redRecycledMetalKg,
    redRecycledGlassKg:         record.redRecycledGlassKg,
    redCompostFoodWasteKg:      record.redCompostFoodWasteKg,
    redCompostLeafBranchKg:     record.redCompostLeafBranchKg,
    redCompostElecKwh:          record.redCompostElecKwh,
    redAnimalFeedKg:            record.redAnimalFeedKg,
    redAnimalType:              record.redAnimalType,
    redSolarUsedKwh:            record.redSolarUsedKwh,
    redSolarMeteredKwh:         record.redSolarMeteredKwh,
    redSolarPanelWatts:         record.redSolarPanelWatts,
    redSolarPanelCount:         record.redSolarPanelCount,
    redSolarDays:               record.redSolarDays,
    redSolarHasMeter:           record.redSolarHasMeter,
    redTreeCount:               record.redTreeCount,
    redTelemedicineCo2e:        record.redTelemedicineCo2e,
    redOtherCo2e:               record.redOtherCo2e,
    redOtherDesc:               record.redOtherDesc,
    scope1Co2e:                 record.scope1Co2e,
    scope2Co2e:                 record.scope2Co2e,
    scope3Co2e:                 record.scope3Co2e,
    totalCo2e:                  record.totalCo2e,
    totalReducedCo2e:           record.totalReducedCo2e,
    netCo2e:                    record.netCo2e,
    notes:     record.notes,
    status:    record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    deletedBy: record.deletedBy,
  };
}

export class CarbonRecordService {
  async list(params: {
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
    const { items, total } = await carbonRecordRepository.list(params);
    const totalPages = Math.ceil(total / params.limit);
    return {
      items: items.map(toDto),
      meta: { page: params.page, limit: params.limit, total, totalPages }
    };
  }

  async findById(id: string): Promise<CarbonRecordDto> {
    const record = await carbonRecordRepository.findById(id);
    if (!record) throw new NotFoundError('Carbon record not found');
    return toDto(record);
  }

  async create(data: CreateCarbonRecordDto, creatorId?: string): Promise<CarbonRecordDto> {
    const existing = await carbonRecordRepository.findByDeptYearMonth(
      data.departmentId, data.year, data.month
    );
    if (existing) {
      throw new BadRequestError(
        `ข้อมูลคาร์บอนของหน่วยงานนี้ เดือน ${data.month}/${data.year} มีอยู่แล้ว`
      );
    }
    const { ef, efRed } = await loadFactorsForYear(data.year);
    const calc = calculateAll(data, ef, efRed);
    const record = await carbonRecordRepository.create({ ...data, ...calc }, creatorId);
    return toDto(record);
  }

  async update(id: string, data: UpdateCarbonRecordDto, updaterId?: string): Promise<CarbonRecordDto> {
    const existing = await carbonRecordRepository.findById(id);
    if (!existing) throw new NotFoundError('Carbon record not found');
    const merged = { ...existing, ...data };
    const { ef, efRed } = await loadFactorsForYear(merged.year);
    const calc = calculateAll(merged, ef, efRed);
    const record = await carbonRecordRepository.update(id, { ...data, ...calc }, updaterId);
    return toDto(record);
  }

  async delete(id: string) {
    const existing = await carbonRecordRepository.findById(id);
    if (!existing) throw new NotFoundError('Carbon record not found');
    await carbonRecordRepository.hardDelete(id);
  }
}

export const carbonRecordService = new CarbonRecordService();
