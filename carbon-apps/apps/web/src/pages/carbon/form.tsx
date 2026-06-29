import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import type { CarbonRecordDto, DepartmentDto, OrganizationDto } from '@enterprise/shared-types';
import { Leaf, Calculator, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context.js';

const MONTH_NAMES_TH = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const SYSTEM_START_YEAR = 2024; // ปีที่เริ่มเก็บข้อมูล ค.ศ. (ตรงกับ พ.ศ. 2567)
const CURRENT_CE_YEAR = new Date().getFullYear();
const CE_YEAR_OPTIONS = Array.from(
  { length: Math.max(3, CURRENT_CE_YEAR - SYSTEM_START_YEAR + 1) },
  (_, i) => Math.max(CURRENT_CE_YEAR, 2026) - i
); // รับประกันมีอย่างน้อย 3 ปีเสมอ (2026, 2025, 2024) ป้องกัน array ว่าง

const EF = {
  s1StationaryDiesel: 2.7078, s1StationaryGasoline: 2.1894, s1CookingLpg: 3.1134,
  s1VehicleDiesel: 2.7406, s1VehicleGasoline: 2.2394, s1VehicleCng: 2.2609,
  s1FireExtCo2: 1.0, s1RefrigHfc134a: 1300, s1RefrigR22: 1760,
  s1AnesthesiaN2o: 0.3249, s1AnesthesiaIsoflur: 0.8160, s1AnesthesiaDesflu: 3.6805, s1AnesthesiaSevoflur: 0.2196,
  s1InfWasteAutoclave: 0.243, s1OrganicWasteFerment: 0.3338, s1OrganicWasteCompost: 0.1102,
  s2Electricity: 0.5781,
  s3Water: 0.5411, s3PaperA4: 5.254, s3PlasticBag: 6.707,
  s3OutsourceDiesel: 2.7406, s3OutsourceGasoline: 2.2394,
  s3GeneralWaste: 0.50, s3HazWasteLandfill: 0.50, s3HazWasteIncin: 0.50, s3InfWasteIncin: 0.50, s3InfWasteAutoclaveExt: 0.243,
  s3TravelCar: 0.168, s3TravelPlane: 0.1539,
  redCompostFood: 0.43, redCompostLeaf: 0.11, redSolar: 0.5781, redTree: 3.67 / 12,
};



type FormState = {
  departmentId: string; year: number; month: number; notes: string; status: string;
  // Scope 1
  s1StationaryDieselLiters: number; s1StationaryGasolineLiters: number; s1CookingLpgKg: number;
  s1VehicleDieselLiters: number; s1VehicleGasolineLiters: number; s1VehicleCngKg: number;
  s1FireExtCo2Kg: number; s1RefrigHfc134aKg: number; s1RefrigR22Kg: number;
  s1AnesthesiaN2oMl: number; s1AnesthesiaIsoflurMl: number; s1AnesthesiaDesfluMl: number; s1AnesthesiaSevoflurMl: number;
  s1InfWasteAutoclaveKg: number; s1OrganicWasteFermentKg: number; s1OrganicWasteCompostKg: number;
  s1WastewaterWaterM3: number; s1WastewaterCodAnaerobicShallow: number; s1WastewaterCodAnaerobicDeep: number; s1WastewaterCodAerobic: number;
  // Scope 2
  s2ElectricityKwh: number;
  // Scope 3
  s3WaterCubicM: number; s3DetergentPowderKg: number; s3LaundryLiquidMl: number;
  s3TonerCartridges: number; s3PaperA4Reams: number; s3PlasticBagKg: number;
  s3GlovesLatexDlcsfogPcs: number; s3GlovesLatexDrofsogPcs: number;
  s3GlovesNitrileEafPcs: number; s3GlovesNitrileDvbPcs: number;
  s3GlovesLatexDfofsogPcs: number; s3GlovesLatexDlxfbogPcs: number; s3GlovesNitrileVbuPcs: number;
  s3MasksBoxes: number;
  s3Amlodipine5mgBoxes: number; s3Amlodipine10mgBoxes: number; s3Deferiprone500mgBottles: number;
  s3Gabapentin100mgBoxes: number; s3Gabapentin300mgBoxes: number; s3Omeprazole20mgBoxes: number;
  s3AlcoholMl: number; s3AmmoniaMl: number; s3NaohKg: number;
  s3AlumKg: number; s3SulfuricAcidKg: number; s3LimeKg: number; s3ChlorineKg: number;
  s3OutsourceDieselLiters: number; s3OutsourceGasolineLiters: number;
  s3GeneralWasteKg: number; s3HazardousWasteLandfillKg: number; s3HazardousWasteIncinKg: number;
  s3InfWasteIncinKg: number; s3InfWasteAutoclaveExtKg: number;
  s3TravelCarKm: number; s3TravelPlaneKm: number;
  // Reductions
  redRecycledPaperKg: number; redRecycledAluminumKg: number; redRecycledPlasticKg: number;
  redRecycledIronKg: number; redRecycledMetalKg: number; redRecycledGlassKg: number;
  redCompostFoodWasteKg: number; redCompostLeafBranchKg: number; redCompostElecKwh: number;
  redAnimalFeedKg: number; redAnimalType: string;
  redSolarUsedKwh: number; redSolarMeteredKwh: number; redSolarPanelWatts: number; redSolarPanelCount: number; redSolarDays: number;
  redSolarHasMeter: boolean;
  redTreeCount: number; redTelemedicineCo2e: number; redOtherCo2e: number; redOtherDesc: string;
};

const DEFAULT_FORM: FormState = {
  departmentId: '', year: CURRENT_CE_YEAR, month: new Date().getMonth() + 1, notes: '', status: 'draft',
  s1StationaryDieselLiters: 0, s1StationaryGasolineLiters: 0, s1CookingLpgKg: 0,
  s1VehicleDieselLiters: 0, s1VehicleGasolineLiters: 0, s1VehicleCngKg: 0,
  s1FireExtCo2Kg: 0, s1RefrigHfc134aKg: 0, s1RefrigR22Kg: 0,
  s1AnesthesiaN2oMl: 0, s1AnesthesiaIsoflurMl: 0, s1AnesthesiaDesfluMl: 0, s1AnesthesiaSevoflurMl: 0,
  s1InfWasteAutoclaveKg: 0, s1OrganicWasteFermentKg: 0, s1OrganicWasteCompostKg: 0,
  s1WastewaterWaterM3: 0, s1WastewaterCodAnaerobicShallow: 0, s1WastewaterCodAnaerobicDeep: 0, s1WastewaterCodAerobic: 0,
  s2ElectricityKwh: 0,
  s3WaterCubicM: 0, s3DetergentPowderKg: 0, s3LaundryLiquidMl: 0,
  s3TonerCartridges: 0, s3PaperA4Reams: 0, s3PlasticBagKg: 0,
  s3GlovesLatexDlcsfogPcs: 0, s3GlovesLatexDrofsogPcs: 0,
  s3GlovesNitrileEafPcs: 0, s3GlovesNitrileDvbPcs: 0,
  s3GlovesLatexDfofsogPcs: 0, s3GlovesLatexDlxfbogPcs: 0, s3GlovesNitrileVbuPcs: 0,
  s3MasksBoxes: 0,
  s3Amlodipine5mgBoxes: 0, s3Amlodipine10mgBoxes: 0, s3Deferiprone500mgBottles: 0,
  s3Gabapentin100mgBoxes: 0, s3Gabapentin300mgBoxes: 0, s3Omeprazole20mgBoxes: 0,
  s3AlcoholMl: 0, s3AmmoniaMl: 0, s3NaohKg: 0,
  s3AlumKg: 0, s3SulfuricAcidKg: 0, s3LimeKg: 0, s3ChlorineKg: 0,
  s3OutsourceDieselLiters: 0, s3OutsourceGasolineLiters: 0,
  s3GeneralWasteKg: 0, s3HazardousWasteLandfillKg: 0, s3HazardousWasteIncinKg: 0,
  s3InfWasteIncinKg: 0, s3InfWasteAutoclaveExtKg: 0,
  s3TravelCarKm: 0, s3TravelPlaneKm: 0,
  redRecycledPaperKg: 0, redRecycledAluminumKg: 0, redRecycledPlasticKg: 0,
  redRecycledIronKg: 0, redRecycledMetalKg: 0, redRecycledGlassKg: 0,
  redCompostFoodWasteKg: 0, redCompostLeafBranchKg: 0, redCompostElecKwh: 0,
  redAnimalFeedKg: 0, redAnimalType: '',
  redSolarUsedKwh: 0, redSolarMeteredKwh: 0, redSolarPanelWatts: 0, redSolarPanelCount: 0, redSolarDays: 0,
  redSolarHasMeter: true,
  redTreeCount: 0, redTelemedicineCo2e: 0, redOtherCo2e: 0, redOtherDesc: '',
};

const calcS1 = (f: FormState) => {
  const wastewaterAnaerobic =
    (5 * f.s1WastewaterWaterM3 * (f.s1WastewaterCodAnaerobicShallow / 1000)) +
    (20 * f.s1WastewaterWaterM3 * (f.s1WastewaterCodAnaerobicDeep / 1000));

  return (
    f.s1StationaryDieselLiters * EF.s1StationaryDiesel + f.s1StationaryGasolineLiters * EF.s1StationaryGasoline + f.s1CookingLpgKg * EF.s1CookingLpg +
    f.s1VehicleDieselLiters * EF.s1VehicleDiesel + f.s1VehicleGasolineLiters * EF.s1VehicleGasoline + f.s1VehicleCngKg * EF.s1VehicleCng +
    f.s1FireExtCo2Kg * EF.s1FireExtCo2 + f.s1RefrigHfc134aKg * EF.s1RefrigHfc134a + f.s1RefrigR22Kg * EF.s1RefrigR22 +
    f.s1AnesthesiaN2oMl * EF.s1AnesthesiaN2o + f.s1AnesthesiaIsoflurMl * EF.s1AnesthesiaIsoflur +
    f.s1AnesthesiaDesfluMl * EF.s1AnesthesiaDesflu + f.s1AnesthesiaSevoflurMl * EF.s1AnesthesiaSevoflur +
    f.s1InfWasteAutoclaveKg * EF.s1InfWasteAutoclave + f.s1OrganicWasteFermentKg * EF.s1OrganicWasteFerment + f.s1OrganicWasteCompostKg * EF.s1OrganicWasteCompost +
    wastewaterAnaerobic
  );
};

const calcS2 = (f: FormState) => f.s2ElectricityKwh * EF.s2Electricity;

const calcS3 = (f: FormState) =>
  f.s3WaterCubicM * EF.s3Water + f.s3PaperA4Reams * EF.s3PaperA4 + f.s3PlasticBagKg * EF.s3PlasticBag +
  f.s3OutsourceDieselLiters * EF.s3OutsourceDiesel + f.s3OutsourceGasolineLiters * EF.s3OutsourceGasoline +
  f.s3GeneralWasteKg * EF.s3GeneralWaste + f.s3HazardousWasteLandfillKg * EF.s3HazWasteLandfill +
  f.s3HazardousWasteIncinKg * EF.s3HazWasteIncin + f.s3InfWasteIncinKg * EF.s3InfWasteIncin +
  f.s3InfWasteAutoclaveExtKg * EF.s3InfWasteAutoclaveExt + f.s3TravelCarKm * EF.s3TravelCar + f.s3TravelPlaneKm * EF.s3TravelPlane;

const calcReduction = (f: FormState) => {
  let solarKwh = f.redSolarMeteredKwh;
  if (!f.redSolarHasMeter && f.redSolarPanelWatts > 0)
    solarKwh = (f.redSolarPanelWatts * f.redSolarPanelCount * f.redSolarDays * 4) / 1000;
  const solarNet = Math.max(0, solarKwh - f.redSolarUsedKwh);
  return f.redCompostFoodWasteKg * EF.redCompostFood + f.redCompostLeafBranchKg * EF.redCompostLeaf +
    solarNet * EF.redSolar + f.redTreeCount * EF.redTree + f.redTelemedicineCo2e + f.redOtherCo2e;
};

const fmt = (v: number | undefined | null) => (v ?? 0).toFixed(2);

const recordToForm = (r: CarbonRecordDto): FormState => ({
  ...DEFAULT_FORM,
  departmentId: r.departmentId,
  year: r.year,
  month: r.month, notes: r.notes || '', status: r.status,
  s1StationaryDieselLiters: r.s1StationaryDieselLiters, s1StationaryGasolineLiters: r.s1StationaryGasolineLiters, s1CookingLpgKg: r.s1CookingLpgKg,
  s1VehicleDieselLiters: r.s1VehicleDieselLiters, s1VehicleGasolineLiters: r.s1VehicleGasolineLiters, s1VehicleCngKg: r.s1VehicleCngKg,
  s1FireExtCo2Kg: r.s1FireExtCo2Kg, s1RefrigHfc134aKg: r.s1RefrigHfc134aKg, s1RefrigR22Kg: r.s1RefrigR22Kg,
  s1AnesthesiaN2oMl: r.s1AnesthesiaN2oMl, s1AnesthesiaIsoflurMl: r.s1AnesthesiaIsoflurMl, s1AnesthesiaDesfluMl: r.s1AnesthesiaDesfluMl, s1AnesthesiaSevoflurMl: r.s1AnesthesiaSevoflurMl,
  s1InfWasteAutoclaveKg: r.s1InfWasteAutoclaveKg, s1OrganicWasteFermentKg: r.s1OrganicWasteFermentKg, s1OrganicWasteCompostKg: r.s1OrganicWasteCompostKg,
  s1WastewaterWaterM3: r.s1WastewaterWaterM3 || 0,
  s1WastewaterCodAnaerobicShallow: r.s1WastewaterCodAnaerobicShallow || 0,
  s1WastewaterCodAnaerobicDeep: r.s1WastewaterCodAnaerobicDeep || 0,
  s1WastewaterCodAerobic: r.s1WastewaterCodAerobic || 0,
  s2ElectricityKwh: r.s2ElectricityKwh,
  s3WaterCubicM: r.s3WaterCubicM, s3DetergentPowderKg: r.s3DetergentPowderKg, s3LaundryLiquidMl: r.s3LaundryLiquidMl,
  s3TonerCartridges: r.s3TonerCartridges, s3PaperA4Reams: r.s3PaperA4Reams, s3PlasticBagKg: r.s3PlasticBagKg,
  s3GlovesLatexDlcsfogPcs: r.s3GlovesLatexDlcsfogPcs, s3GlovesLatexDrofsogPcs: r.s3GlovesLatexDrofsogPcs,
  s3GlovesNitrileEafPcs: r.s3GlovesNitrileEafPcs, s3GlovesNitrileDvbPcs: r.s3GlovesNitrileDvbPcs,
  s3GlovesLatexDfofsogPcs: r.s3GlovesLatexDfofsogPcs, s3GlovesLatexDlxfbogPcs: r.s3GlovesLatexDlxfbogPcs, s3GlovesNitrileVbuPcs: r.s3GlovesNitrileVbuPcs,
  s3MasksBoxes: r.s3MasksBoxes,
  s3Amlodipine5mgBoxes: r.s3Amlodipine5mgBoxes, s3Amlodipine10mgBoxes: r.s3Amlodipine10mgBoxes, s3Deferiprone500mgBottles: r.s3Deferiprone500mgBottles,
  s3Gabapentin100mgBoxes: r.s3Gabapentin100mgBoxes, s3Gabapentin300mgBoxes: r.s3Gabapentin300mgBoxes, s3Omeprazole20mgBoxes: r.s3Omeprazole20mgBoxes,
  s3AlcoholMl: r.s3AlcoholMl, s3AmmoniaMl: r.s3AmmoniaMl, s3NaohKg: r.s3NaohKg,
  s3AlumKg: r.s3AlumKg, s3SulfuricAcidKg: r.s3SulfuricAcidKg, s3LimeKg: r.s3LimeKg, s3ChlorineKg: r.s3ChlorineKg,
  s3OutsourceDieselLiters: r.s3OutsourceDieselLiters, s3OutsourceGasolineLiters: r.s3OutsourceGasolineLiters,
  s3GeneralWasteKg: r.s3GeneralWasteKg, s3HazardousWasteLandfillKg: r.s3HazardousWasteLandfillKg, s3HazardousWasteIncinKg: r.s3HazardousWasteIncinKg,
  s3InfWasteIncinKg: r.s3InfWasteIncinKg, s3InfWasteAutoclaveExtKg: r.s3InfWasteAutoclaveExtKg,
  s3TravelCarKm: r.s3TravelCarKm, s3TravelPlaneKm: r.s3TravelPlaneKm,
  redRecycledPaperKg: r.redRecycledPaperKg, redRecycledAluminumKg: r.redRecycledAluminumKg, redRecycledPlasticKg: r.redRecycledPlasticKg,
  redRecycledIronKg: r.redRecycledIronKg, redRecycledMetalKg: r.redRecycledMetalKg, redRecycledGlassKg: r.redRecycledGlassKg,
  redCompostFoodWasteKg: r.redCompostFoodWasteKg, redCompostLeafBranchKg: r.redCompostLeafBranchKg, redCompostElecKwh: r.redCompostElecKwh,
  redAnimalFeedKg: r.redAnimalFeedKg, redAnimalType: r.redAnimalType || '',
  redSolarUsedKwh: r.redSolarUsedKwh, redSolarMeteredKwh: r.redSolarMeteredKwh, redSolarPanelWatts: r.redSolarPanelWatts,
  redSolarPanelCount: r.redSolarPanelCount, redSolarDays: r.redSolarDays,
  redSolarHasMeter: r.redSolarHasMeter !== undefined ? r.redSolarHasMeter : true,
  redTreeCount: r.redTreeCount, redTelemedicineCo2e: r.redTelemedicineCo2e, redOtherCo2e: r.redOtherCo2e, redOtherDesc: r.redOtherDesc || '',
});

const ic = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400';

const NF = ({ label, field, form, setForm, unit }: { label: string; field: keyof FormState; form: FormState; setForm: (f: FormState) => void; unit?: string }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}{unit && <span className="text-slate-400 ml-1">({unit})</span>}</label>
    <input type="number" min={0} step={0.001} value={(form[field] as number) || ''} placeholder="0"
      onChange={e => { const n = parseFloat(e.target.value); setForm({ ...form, [field]: isNaN(n) || n < 0 ? 0 : n }); }}
      className={ic} />
  </div>
);

const CardGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 h-full flex flex-col">
    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-1.5 shrink-0">{title}</h5>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">{children}</div>
  </div>
);

export const CarbonRecordForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { payload, user } = useAuth();
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;
  const isAdmin = payload?.roles.includes('Admin') || false;
  const isEditMode = !!id;
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<FormState>({ ...DEFAULT_FORM });
  const [formOrgId, setFormOrgId] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  // Fetch profile จาก DB เพื่อให้ได้ departmentId ล่าสุด (ไม่ใช้ JWT stale)
  const { data: profile } = useQuery<{ departmentId?: string | null; department?: { name: string } | null }>({
    queryKey: ['auth-profile-for-form'],
    queryFn: async () => { const res: any = await api.get('/auth/profile'); return res.data; },
    enabled: !isSuperAdmin && !isAdmin, // เฉพาะ Regular User
    staleTime: 60 * 1000, // cache 1 นาที
  });

  useEffect(() => {
    if (!isEditMode && payload) {
      setFormOrgId(isSuperAdmin ? '' : (payload.organizationId || ''));
      if (!isSuperAdmin && !isAdmin) {
        // ใช้ departmentId จาก profile (DB) ถ้ามี, fallback ไป payload.departmentId
        const deptId = profile?.departmentId || payload.departmentId || '';
        setFormData(prev => ({ ...prev, departmentId: deptId }));
      }
    }
  }, [isEditMode, payload, isSuperAdmin, isAdmin, profile]);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger';
    showCancel: boolean;
    confirmLabel: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    confirmLabel: 'ตกลง'
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'danger',
    onConfirm?: () => void,
    showCancel: boolean = false,
    confirmLabel: string = 'ตกลง'
  ) => {
    setAlertDialog({
      isOpen: true,
      title,
      message,
      type,
      showCancel,
      confirmLabel,
      onConfirm
    });
  };

  // Fetch organization list (SuperAdmin เห็นทั้งหมด, Admin/User เห็นขององค์กรตัวเอง)
  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-all'],
    queryFn: async () => { const res: any = await api.get('/organizations', { params: { limit: 100 } }); return res.data; },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // สำหรับ Admin/User ที่มี organizationId — ดึงข้อมูล org ของตัวเอง
  const { data: myOrg } = useQuery<OrganizationDto>({
    queryKey: ['organization-mine', payload?.organizationId],
    queryFn: async () => { const res: any = await api.get(`/organizations/${payload!.organizationId}`); return res.data; },
    enabled: !isSuperAdmin && !!payload?.organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ชื่อองค์กรที่แสดงใน label (สำหรับ Admin/User)
  const orgDisplayName = isSuperAdmin
    ? (orgs?.find(o => o.id === formOrgId)?.name || '')
    : (myOrg?.name || '');

  // Fetch departments: SuperAdmin/Admin ใช้ formOrgId, User ธรรมดาใช้ organizationId จาก payload
  const deptOrgId = (isSuperAdmin || isAdmin) ? formOrgId : (payload?.organizationId || '');
  const { data: formDepts } = useQuery<DepartmentDto[]>({
    queryKey: ['departments-all-form', deptOrgId],
    queryFn: async () => { const res: any = await api.get('/departments/all', { params: { organizationId: deptOrgId || undefined } }); return res.data; },
    enabled: !!deptOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Load editing record data if edit mode
  const { data: record, isSuccess, isError } = useQuery<CarbonRecordDto>({
    queryKey: ['carbon-record-detail', id],
    queryFn: async () => {
      const res: any = await api.get(`/carbon-records/${id}`);
      return res.data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (isSuccess && record) {
      setFormOrgId(record.department?.organizationId || '');
      setFormData(recordToForm(record));
    }
  }, [isSuccess, record]);

  useEffect(() => {
    if (isError) {
      showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลคาร์บอนที่ต้องการแก้ไขได้', 'danger', () => navigate('/carbon'));
    }
  }, [isError]);

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/carbon-records', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon-records'] });
      showAlert('บันทึกข้อมูลสำเร็จ', 'ระบบได้ทำการสร้างข้อมูลบันทึกคาร์บอนเรียบร้อยแล้ว', 'info', () => navigate('/carbon'));
    },
    onError: (e: any) => showAlert('บันทึกข้อมูลไม่สำเร็จ', e.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'danger')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => api.put(`/carbon-records/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon-records'] });
      showAlert('อัปเดตข้อมูลสำเร็จ', 'ระบบได้ทำการอัปเดตข้อมูลบันทึกคาร์บอนเรียบร้อยแล้ว', 'info', () => navigate('/carbon'));
    },
    onError: (e: any) => showAlert('อัปเดตข้อมูลไม่สำเร็จ', e.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'danger')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Regular User ต้องมี departmentId ใน JWT เสมอ
    if (!isSuperAdmin && !isAdmin && !payload?.departmentId) {
      showAlert('ไม่มีข้อมูลหน่วยงาน', 'บัญชีผู้ใช้นี้ยังไม่ได้ถูกกำหนดสังกัดหน่วยงาน กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดหน่วยงานให้บัญชีของคุณ', 'warning');
      return;
    }

    if (!formData.departmentId && (isSuperAdmin || isAdmin)) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุหน่วยงานก่อนทำการบันทึกข้อมูล', 'warning');
      return;
    }
    setConfirmSave(true);
  };

  const handleSaveConfirm = () => {
    setConfirmSave(false);
    // Convert BE → CE before sending to API
    const body = { ...formData };

    // Regular User: ใช้ departmentId จาก DB (profile query) ถ้ามี เพื่อป้องกัน JWT stale
    if (!isSuperAdmin && !isAdmin) {
      const latestDeptId = profile?.departmentId || payload?.departmentId;
      if (latestDeptId) body.departmentId = latestDeptId;
    }

    if (isEditMode) {
      updateMutation.mutate({ id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const s1 = calcS1(formData);
  const s2 = calcS2(formData);
  const s3 = calcS3(formData);
  const red = calcReduction(formData);
  const total = s1 + s2 + s3;
  const net = total - red;

  const TABS = ['ข้อมูลทั่วไป', 'ขอบเขตที่ 1 ( direct )', 'ขอบเขตที่ 2 ( indirect-electricity )', 'ขอบเขตที่ 3 ( indirect-value chain )', 'กิจกรรมลดโลกร้อน'];
  const f = formData;
  const sf = setFormData;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* <button type="button" onClick={() => navigate('/carbon')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0" title="ย้อนกลับ">
            <ArrowLeft size={20} />
          </button> */}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Leaf className="text-emerald-500 shrink-0" size={22} />
              <span className="truncate">{isEditMode ? 'แก้ไขข้อมูลบันทึกคาร์บอน' : 'บันทึกข้อมูลคาร์บอนใหม่'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">กรอกและจัดหมวดหมู่ข้อมูลคาร์บอนตามขอบเขตการปล่อยก๊าซเรือนกระจกรายเดือน</p>
          </div>
        </div>

        {/* CO2e Summary Panel */}
        <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 shadow-sm border border-slate-800 font-mono text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-amber-400">S1: <strong>{fmt(s1)}</strong></span>
            <span className="text-blue-400">S2: <strong>{fmt(s2)}</strong></span>
            <span className="text-teal-400">S3: <strong>{fmt(s3)}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-rose-400">ลด: <strong>-{fmt(red)}</strong></span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1"><Calculator size={13} />สุทธิ {fmt(net)} kgCO₂e</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row flex-1 min-h-0">
        {/* Sidebar Tabs */}
        <div className="md:w-56 md:h-full bg-slate-50 border-r border-slate-200 p-3 space-y-1 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0">
          {TABS.map((tab, i) => (
            <button key={i} type="button" onClick={() => setActiveTab(i)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between whitespace-nowrap md:whitespace-normal ${activeTab === i ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span>{tab.split(' (')[0]}</span>
              {/* {activeTab === i && <span className="hidden md:inline text-[10px] bg-emerald-600 px-1.5 py-0.5 rounded text-white font-mono">ACTIVE</span>} */}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tab 0: ข้อมูลทั่วไป */}
              {activeTab === 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
                    📋 ข้อมูลทั่วไปของหน่วยงานและการระบุเวลา
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">องค์กร</label>
                      {isSuperAdmin ? (
                        <select value={formOrgId} onChange={e => { setFormOrgId(e.target.value); sf({ ...f, departmentId: '' }); }} className={ic} disabled={isEditMode}>
                          <option value="">-- เลือกองค์กร --</option>
                          {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      ) : (
                        <input type="text" readOnly value={orgDisplayName || 'กำลังโหลด...'} className={`${ic} bg-slate-50 text-slate-500 cursor-not-allowed`} />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">หน่วยงาน <span className="text-rose-500">*</span></label>
                      {(!isSuperAdmin && !isAdmin) ? (
                        // Regular User: แสดงชื่อหน่วยงานจาก user.department.name โดยตรง (read-only)
                        <input
                          type="text"
                          readOnly
                          value={profile?.department?.name ?? user?.department?.name ?? (payload?.departmentId ? 'กำลังโหลด...' : 'ไม่ระบุหน่วยงาน')}
                          className={`${ic} bg-slate-50 text-slate-500 cursor-not-allowed`}
                        />
                      ) : (
                        // SuperAdmin หรือ Admin: dropdown เลือกได้
                        <select
                          required
                          value={f.departmentId}
                          onChange={e => sf({ ...f, departmentId: e.target.value })}
                          className={`${ic} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                          disabled={isEditMode || (isSuperAdmin && !formOrgId)}
                        >
                          <option value="">-- เลือกหน่วยงาน --</option>
                          {formDepts?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">ปี (พ.ศ.) <span className="text-rose-500">*</span></label>
                      <select required value={f.year} onChange={e => sf({ ...f, year: parseInt(e.target.value, 10) || CURRENT_CE_YEAR })} disabled={isEditMode} className={`${ic} disabled:bg-slate-50`}>
                        {CE_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y + 543}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">เดือน <span className="text-rose-500">*</span></label>
                      <select required value={f.month} onChange={e => sf({ ...f, month: parseInt(e.target.value, 10) })} disabled={isEditMode} className={`${ic} disabled:bg-slate-50`}>
                        {MONTH_NAMES_TH.slice(1).map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">หมายเหตุ</label>
                    <textarea value={f.notes} onChange={e => sf({ ...f, notes: e.target.value })} rows={4} placeholder="รายละเอียดหรือข้อมูลอ้างอิงเพิ่มเติม..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  </div>
                </div>
              )}

              {/* Tab 1: Scope 1 */}
              {activeTab === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700">🔥 ขอบเขตที่ 1: การปล่อยก๊าซเรือนกระจกโดยตรง (Direct Emissions)</h4>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{fmt(s1)} kgCO₂e</span>
                  </div>

                  <CardGroup title="🏭 การเผาไหม้อยู่กับที่ (Stationary Combustion)">
                    <NF label="ปริมาณน้ำมันดีเซล (เครื่องจักร)" field="s1StationaryDieselLiters" unit="ลิตร" form={f} setForm={sf} />
                    <NF label="ปริมาณน้ำมันเบนซิน (เครื่องจักร)" field="s1StationaryGasolineLiters" unit="ลิตร" form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="🚗 การเผาไหม้แบบเคลื่อนที่ (Mobile Combustion)">
                    <NF label="ปริมาณน้ำมันดีเซล (ยานพาหนะองค์กร)" field="s1VehicleDieselLiters" unit="ลิตร" form={f} setForm={sf} />
                    <NF label="ปริมาณน้ำมันเบนซิน (ยานพาหนะองค์กร)" field="s1VehicleGasolineLiters" unit="ลิตร" form={f} setForm={sf} />
                    <NF label="ปริมาณก๊าซ CNG (ยานพาหนะองค์กร)" field="s1VehicleCngKg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="💨 การรั่วไหลและอื่นๆ (Fugitive Emissions)">
                    <NF label="ปริมาณถังดับเพลิง (ชนิด CO₂)" field="s1FireExtCo2Kg" unit="กก." form={f} setForm={sf} />
                    <NF label="สารทำความเย็น HFC-134a" field="s1RefrigHfc134aKg" unit="กก." form={f} setForm={sf} />
                    <NF label="สารทำความเย็น R22" field="s1RefrigR22Kg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="🗑️ การกำจัดมูลฝอยในองค์กร (On-site Waste Treatment)">
                    <NF label="มูลฝอยติดเชื้อ (ใช้ Autoclave)" field="s1InfWasteAutoclaveKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยอินทรีย์ (ทำน้ำหมักชีวภาพ)" field="s1OrganicWasteFermentKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยอินทรีย์ (ปุ๋ยหมักแบบไม่เติมอากาศ)" field="s1OrganicWasteCompostKg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 h-full flex flex-col">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-1.5 shrink-0">💧 การบำบัดน้ำเสีย (Wastewater Treatment)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                      <NF label="ปริมาณน้ำที่เข้าระบบบำบัด" field="s1WastewaterWaterM3" unit="ลบ.ม." form={f} setForm={sf} />
                      <NF label="บำบัดไม่เติมอากาศ: COD บ่อตื้น (ลึกไม่เกิน 2 เมตร)" field="s1WastewaterCodAnaerobicShallow" unit="mg/L" form={f} setForm={sf} />
                      <NF label="บำบัดไม่เติมอากาศ: COD บ่อลึก (ลึกเกิน 2 เมตร)" field="s1WastewaterCodAnaerobicDeep" unit="mg/L" form={f} setForm={sf} />
                      <NF label="บำบัดแบบเติมอากาศ: ค่า COD น้ำเสีย" field="s1WastewaterCodAerobic" unit="mg/L" form={f} setForm={sf} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Scope 2 */}
              {activeTab === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700">⚡ ขอบเขตที่ 2: การปล่อยก๊าซเรือนกระจกทางอ้อมจากการใช้พลังงาน (Energy Indirect)</h4>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{fmt(s2)} kgCO₂e</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 max-w-md space-y-4">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">การใช้ไฟฟ้าภายนอก</h5>
                    <NF label="ปริมาณการใช้ไฟฟ้าขององค์กร" field="s2ElectricityKwh" unit="kWh" form={f} setForm={sf} />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      * คำนวณจากสัมประสิทธิ์การปล่อยก๊าซเฉลี่ยของระบบไฟฟ้าประเทศไทย (EGAT): 0.5781 kgCO₂e/kWh
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Scope 3 */}
              {activeTab === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700">📦 ขอบเขตที่ 3: การปล่อยก๊าซเรือนกระจกทางอ้อมอื่น ๆ (Other Indirect)</h4>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{fmt(s3)} kgCO₂e</span>
                  </div>

                  <CardGroup title="🛍️ การซื้อวัตถุดิบ และบริการ (Purchased Goods and Services)">
                    <NF label="ปริมาณการใช้น้ำประปา" field="s3WaterCubicM" unit="ลบ.ม." form={f} setForm={sf} />
                    <NF label="ปริมาณการเบิกหมึกพิมพ์เลเซอร์" field="s3TonerCartridges" unit="ตลับ" form={f} setForm={sf} />
                    <NF label="ปริมาณการเบิกกระดาษ A4" field="s3PaperA4Reams" unit="รีม" form={f} setForm={sf} />
                    <NF label="ปริมาณการใช้ถุงขยะพลาสติก" field="s3PlasticBagKg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="🧪 การใช้สารเคมี (Chemical Usage)">
                    <NF label="ปริมาณการใช้ Alcohol" field="s3AlcoholMl" unit="มล." form={f} setForm={sf} />
                    <NF label="ปริมาณโซเดียมไฮดรอกไซด์" field="s3NaohKg" unit="กก." form={f} setForm={sf} />
                    <NF label="ปริมาณการใช้สารส้ม" field="s3AlumKg" unit="กก." form={f} setForm={sf} />
                    <NF label="ปริมาณการใช้ กรดซัลฟุริค" field="s3SulfuricAcidKg" unit="กก." form={f} setForm={sf} />
                    <NF label="ปริมาณการใช้ ปูนขาว" field="s3LimeKg" unit="กก." form={f} setForm={sf} />
                    <NF label="ปริมาณการใช้ คลอรีน" field="s3ChlorineKg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="⛽ การใช้น้ำมันเชื้อเพลิงยานพาหนะภายนอก (Outsourced Fuel)">
                    <NF label="ปริมาณน้ำมันดีเซล (จ้างเหมา)" field="s3OutsourceDieselLiters" unit="ลิตร" form={f} setForm={sf} />
                    <NF label="ปริมาณน้ำมันเบนซิน (จ้างเหมา)" field="s3OutsourceGasolineLiters" unit="ลิตร" form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="🗑️ ของเสียจากการดำเนินกิจกรรม (Waste Generated in Operations)">
                    <NF label="ปริมาณมูลฝอยทั่วไป (กำจัดภายนอก)" field="s3GeneralWasteKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยอันตราย (กำจัดโดยฝังกลบ)" field="s3HazardousWasteLandfillKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยอันตราย (กำจัดโดยเผา)" field="s3HazardousWasteIncinKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยติดเชื้อ (กำจัดโดยเผา)" field="s3InfWasteIncinKg" unit="กก." form={f} setForm={sf} />
                    <NF label="มูลฝอยติดเชื้อ (กำจัดโดย Autoclave)" field="s3InfWasteAutoclaveExtKg" unit="กก." form={f} setForm={sf} />
                  </CardGroup>

                  <CardGroup title="✈️ การเดินทางเพื่อธุรกิจ (Business Travel)">
                    <NF label="ระยะการเดินทางเครื่องบิน (ชั้นประหยัด)" field="s3TravelPlaneKm" unit="กม." form={f} setForm={sf} />
                  </CardGroup>
                </div>
              )}

              {/* Tab 4: กิจกรรมลดโลกร้อน */}
              {activeTab === 4 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700">🌱 กิจกรรมลดและดูดกลับก๊าซเรือนกระจก (GHG Reductions & Removals)</h4>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ลดได้ -{fmt(red)} kgCO₂e</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">☀️ ระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ (Solar Cell)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">ประเภทการวัดพลังงาน</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" checked={f.redSolarHasMeter} onChange={() => sf({ ...f, redSolarHasMeter: true })} className="text-emerald-500 focus:ring-emerald-400" />
                            มีมิเตอร์ที่ Solar Cell
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" checked={!f.redSolarHasMeter} onChange={() => sf({ ...f, redSolarHasMeter: false })} className="text-emerald-500 focus:ring-emerald-400" />
                            ไม่มีมิเตอร์
                          </label>
                        </div>
                      </div>
                      <NF label="ไฟฟ้าที่ใช้ในระบบผลิต (ไฟฟ้าสูญเสีย)" field="redSolarUsedKwh" unit="kWh" form={f} setForm={sf} />
                    </div>

                    {f.redSolarHasMeter ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <NF label="ไฟฟ้าที่ผลิตได้จริง (จากมิเตอร์)" field="redSolarMeteredKwh" unit="kWh" form={f} setForm={sf} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200/60">
                        <NF label="กำลังการผลิตแผงเซลล์" field="redSolarPanelWatts" unit="วัตต์ต่อแผง" form={f} setForm={sf} />
                        <NF label="จำนวนแผงเซลล์แสงอาทิตย์" field="redSolarPanelCount" unit="แผง" form={f} setForm={sf} />
                        <NF label="จำนวนวันที่ผลิตไฟฟ้าในเดือนนี้" field="redSolarDays" unit="วัน" form={f} setForm={sf} />
                      </div>
                    )}
                  </div>

                  {/* Other reduction fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 h-full flex flex-col">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-1.5 shrink-0">♻️ การแยกขยะและการหมักขยะอาหาร</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <NF label="ขยะอาหารทำปุ๋ยหมัก" field="redCompostFoodWasteKg" unit="กก." form={f} setForm={sf} />
                        <NF label="ใบไม้ทำปุ๋ยหมัก" field="redCompostLeafBranchKg" unit="กก." form={f} setForm={sf} />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 h-full flex flex-col">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 pb-1.5 shrink-0">🌳 การเพาะปลูกต้นไม้ดูแลป่า"</h5>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 flex-1">
                        <NF label="จำนวนต้นไม้ที่ปลูก/ดูแลในเดือนนี้" field="redTreeCount" unit="ต้น" form={f} setForm={sf} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-white">
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveTab(t => Math.max(0, t - 1))} disabled={activeTab === 0}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={16} /> ก่อนหน้า
                </button>
                <button type="button" onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))} disabled={activeTab === TABS.length - 1}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
                  ถัดไป <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/carbon')} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
                  ยกเลิก
                </button>
                <button type="submit" className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors">
                  <Save size={16} />
                  {isEditMode ? 'บันทึกการแก้ไขข้อมูล' : 'บันทึกข้อมูลคาร์บอน'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog isOpen={confirmSave} title={isEditMode ? 'ยืนยันการแก้ไขข้อมูล' : 'ยืนยันการบันทึกข้อมูล'}
        message={isEditMode ? 'คุณต้องการบันทึกการเปลี่ยนแปลงของข้อมูลคาร์บอนนี้ใช่หรือไม่?' : 'คุณต้องการสร้างข้อมูลบันทึกคาร์บอนใหม่ใช่หรือไม่?'}
        type="info" onConfirm={handleSaveConfirm} onClose={() => setConfirmSave(false)} />

      <ConfirmDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        confirmLabel={alertDialog.confirmLabel}
        showCancel={alertDialog.showCancel}
        onConfirm={() => {
          setAlertDialog(prev => ({ ...prev, isOpen: false }));
          if (alertDialog.onConfirm) alertDialog.onConfirm();
        }}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default CarbonRecordForm;
