// --- Standard API Structures ---
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ApiMeta;
  errors?: ApiError[];
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: any;
}

export interface ApiError {
  field?: string;
  message: string;
}

// --- Common Audit Fields ---
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedBy?: string | null;
}

// --- Auth DTOs ---
export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  organizationId?: string | null;
  departmentId?: string | null;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshTokenResponseData {
  accessToken: string;
  refreshToken: string;
}

// --- Permission DTOs ---
export interface PermissionDto extends AuditFields {
  id: string;
  name: string;
  description?: string | null;
}

export interface CreatePermissionDto {
  name: string;
  description?: string;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
}

// --- Role DTOs ---
export interface RoleDto extends AuditFields {
  id: string;
  name: string;
  description?: string | null;
  permissions?: PermissionDto[];
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// --- Organization DTOs ---
export interface OrganizationDto extends AuditFields {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  _count?: { departments: number };
}

export interface CreateOrganizationDto {
  code: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
}

export interface UpdateOrganizationDto {
  code?: string;
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
}

// --- Department DTOs ---
export interface DepartmentDto extends AuditFields {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  organizationId: string;
  organization?: OrganizationDto | null;
  _count?: { users: number };
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description?: string;
  organizationId: string;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
  description?: string;
  organizationId?: string;
}

// --- User DTOs ---
export interface UserDto extends AuditFields {
  id: string;
  email: string;
  name: string;
  roleId?: string | null;
  role?: RoleDto | null;
  departmentId?: string | null;
  department?: DepartmentDto | null;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  name: string;
  roleId?: string;
  departmentId?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  roleId?: string;
  departmentId?: string | null;
}

// --- Carbon Record DTOs ---
export interface CarbonEmissionFields {
  // Scope 1 — Stationary
  s1StationaryDieselLiters: number;
  s1StationaryGasolineLiters: number;
  s1CookingLpgKg: number;
  // Scope 1 — Mobile
  s1VehicleDieselLiters: number;
  s1VehicleGasolineLiters: number;
  s1VehicleCngKg: number;
  // Scope 1 — Fugitive
  s1FireExtCo2Kg: number;
  s1RefrigHfc134aKg: number;
  s1RefrigR22Kg: number;
  s1AnesthesiaN2oMl: number;
  s1AnesthesiaIsoflurMl: number;
  s1AnesthesiaDesfluMl: number;
  s1AnesthesiaSevoflurMl: number;
  // Scope 1 — Internal Waste
  s1InfWasteAutoclaveKg: number;
  s1OrganicWasteFermentKg: number;
  s1OrganicWasteCompostKg: number;
  // Scope 1 — Wastewater
  s1WastewaterWaterM3: number;
  s1WastewaterCodAnaerobicShallow: number;
  s1WastewaterCodAnaerobicDeep: number;
  s1WastewaterCodAerobic: number;
  // Scope 2
  s2ElectricityKwh: number;
  // Scope 3 — Resources
  s3WaterCubicM: number;
  s3DetergentPowderKg: number;
  s3LaundryLiquidMl: number;
  s3TonerCartridges: number;
  s3PaperA4Reams: number;
  s3PlasticBagKg: number;
  // Scope 3 — Medical Supplies
  s3GlovesLatexDlcsfogPcs: number;
  s3GlovesLatexDrofsogPcs: number;
  s3GlovesNitrileEafPcs: number;
  s3GlovesNitrileDvbPcs: number;
  s3GlovesLatexDfofsogPcs: number;
  s3GlovesLatexDlxfbogPcs: number;
  s3GlovesNitrileVbuPcs: number;
  s3MasksBoxes: number;
  // Scope 3 — Medications
  s3Amlodipine5mgBoxes: number;
  s3Amlodipine10mgBoxes: number;
  s3Deferiprone500mgBottles: number;
  s3Gabapentin100mgBoxes: number;
  s3Gabapentin300mgBoxes: number;
  s3Omeprazole20mgBoxes: number;
  // Scope 3 — Chemicals
  s3AlcoholMl: number;
  s3AmmoniaMl: number;
  s3NaohKg: number;
  s3AlumKg: number;
  s3SulfuricAcidKg: number;
  s3LimeKg: number;
  s3ChlorineKg: number;
  // Scope 3 — Outsourced Fuel
  s3OutsourceDieselLiters: number;
  s3OutsourceGasolineLiters: number;
  // Scope 3 — External Waste
  s3GeneralWasteKg: number;
  s3HazardousWasteLandfillKg: number;
  s3HazardousWasteIncinKg: number;
  s3InfWasteIncinKg: number;
  s3InfWasteAutoclaveExtKg: number;
  // Scope 3 — Travel
  s3TravelCarKm: number;
  s3TravelPlaneKm: number;
  // Reduction Activities
  redRecycledPaperKg: number;
  redRecycledAluminumKg: number;
  redRecycledPlasticKg: number;
  redRecycledIronKg: number;
  redRecycledMetalKg: number;
  redRecycledGlassKg: number;
  redCompostFoodWasteKg: number;
  redCompostLeafBranchKg: number;
  redCompostElecKwh: number;
  redAnimalFeedKg: number;
  redAnimalType?: string | null;
  redSolarUsedKwh: number;
  redSolarMeteredKwh: number;
  redSolarPanelWatts: number;
  redSolarPanelCount: number;
  redSolarDays: number;
  redSolarHasMeter: boolean;
  redTreeCount: number;
  redTelemedicineCo2e: number;
  redOtherCo2e: number;
  redOtherDesc?: string | null;
}

export interface CarbonRecordDto extends AuditFields, CarbonEmissionFields {
  id: string;
  departmentId: string;
  department?: DepartmentDto | null;
  year: number;
  month: number;
  scope1Co2e?: number | null;
  scope2Co2e?: number | null;
  scope3Co2e?: number | null;
  totalCo2e?: number | null;
  totalReducedCo2e?: number | null;
  netCo2e?: number | null;
  notes?: string | null;
  status: string;
}

export interface CreateCarbonRecordDto extends Partial<CarbonEmissionFields> {
  departmentId: string;
  year: number;
  month: number;
  notes?: string;
  status?: string;
}

export interface UpdateCarbonRecordDto extends Partial<CarbonEmissionFields> {
  notes?: string;
  status?: string;
}

// --- Dashboard DTOs ---
export interface DashboardStatsDto {
  usersCount: number;
  rolesCount: number;
  permissionsCount: number;
  activeSessionsCount: number;
  recentUsers: UserDto[];
}

export interface CarbonStatsSummaryDto {
  year: number;
  emission: number;
  reduction: number;
  removal: number;
  net: number;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface CarbonStatsScopeBreakdownDto {
  scope1: {
    stationary: number;
    mobile: number;
    fugitive: number;
    waste: number;
    wastewater: number;
  };
  scope2: {
    electricity: number;
  };
  scope3: {
    resources: number;
    outsourcedFuel: number;
    externalWaste: number;
    travel: number;
  };
}

export interface CarbonTopActivityDto {
  name: string;
  value: number;
  percentage: number;
}

export interface CarbonDashboardStatsDto {
  summary: {
    baseYear: CarbonStatsSummaryDto;
    currentYear: CarbonStatsSummaryDto;
  };
  scopeBreakdown: {
    baseYear: CarbonStatsScopeBreakdownDto;
    currentYear: CarbonStatsScopeBreakdownDto;
  };
  topActivities: CarbonTopActivityDto[];
}
export interface EmissionFactorDto extends AuditFields {
  id: string;
  year: number;
  category: string;
  key: string;
  name: string;
  value: number;
  unit: string;
  source?: string | null;
  sourceUrl?: string | null;
}

export interface CreateEmissionFactorDto {
  year: number;
  category: string;
  key: string;
  name: string;
  value: number;
  unit: string;
  source?: string | null;
  sourceUrl?: string | null;
}

export interface UpdateEmissionFactorDto {
  name?: string;
  value?: number;
  unit?: string;
  source?: string | null;
  sourceUrl?: string | null;
}

// ===================== CARBON FORMULA MANAGEMENT DTOs =====================

export interface CarbonFormulaVariableDto {
  id: string;
  formulaId: string;
  varName: string;
  label: string;
  unit: string;
  defaultValue?: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonFormulaHistoryDto {
  id: string;
  formulaId: string;
  action: string;
  changedBy?: string | null;
  changedAt: Date;
  snapshot: string; // JSON string
}

export interface CarbonFormulaDto extends AuditFields {
  id: string;
  fiscalYear: number;
  name: string;
  dataType: string;    // 'activity' | 'emission_source'
  version: number;
  status: string;      // 'draft' | 'active' | 'inactive'
  expression: string;
  emissionFactor?: string | null;
  notes?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  variables?: CarbonFormulaVariableDto[];
  history?: CarbonFormulaHistoryDto[];
}

export interface CreateCarbonFormulaVariableDto {
  varName: string;
  label: string;
  unit: string;
  defaultValue?: number;
  sortOrder?: number;
}

export interface CreateCarbonFormulaDto {
  fiscalYear: number;
  name: string;
  dataType: string;
  version?: number;
  status?: string;
  expression: string;
  emissionFactor?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  variables?: CreateCarbonFormulaVariableDto[];
}

export interface UpdateCarbonFormulaDto {
  name?: string;
  dataType?: string;
  status?: string;
  expression?: string;
  emissionFactor?: string;
  notes?: string;
  startDate?: string | null;
  endDate?: string | null;
  variables?: CreateCarbonFormulaVariableDto[];
}

export interface CloneFormulaDto {
  fromFiscalYear: number;
  toFiscalYear: number;
  formulaIds?: string[]; // ถ้าไม่ระบุ = clone ทั้งหมดของปีนั้น
}
