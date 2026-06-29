import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useAuth } from '../../contexts/auth-context.js';
import { useToast } from '../../contexts/toast-context.js';
import { Select2 } from '../../components/select2.js';
import { X, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { OrganizationDto, DepartmentDto } from '@enterprise/shared-types';
// @ts-ignore
import XLSX from 'xlsx-js-style';

interface CarbonReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES_TH = [
  'ทุกเดือน', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const SYSTEM_START_YEAR = 2024;
const CURRENT_CE_YEAR = new Date().getFullYear();
const CE_YEAR_OPTIONS = Array.from(
  { length: Math.max(3, CURRENT_CE_YEAR - SYSTEM_START_YEAR + 1) },
  (_, i) => Math.max(CURRENT_CE_YEAR, 2026) - i
); // รับประกันมีอย่างน้อย 3 ปีเสมอ (2026, 2025, 2024) ป้องกัน array ว่าง

interface ReportRowDefinition {
  key: string;
  label: string;
  scope: string;
  unit: string;
}

const REPORT_ROWS: ReportRowDefinition[] = [
  // สรุปภาพรวม
  { key: 'scope1Co2e', label: 'ขอบเขตที่ 1 (Scope 1)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },
  { key: 'scope2Co2e', label: 'ขอบเขตที่ 2 (Scope 2)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },
  { key: 'scope3Co2e', label: 'ขอบเขตที่ 3 (Scope 3)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },
  { key: 'totalCo2e', label: 'ปริมาณการปล่อยก๊าซเรือนกระจกรวม (Total Emissions)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },
  { key: 'totalReducedCo2e', label: 'ปริมาณการลดหย่อนรวม (Total Reductions)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },
  { key: 'netCo2e', label: 'การปล่อยก๊าซเรือนกระจกสุทธิ (Net Emissions)', scope: 'สรุปภาพรวม (Summary)', unit: 'kgCO2e' },

  // ขอบเขตที่ 1
  { key: 's1StationaryDieselLiters', label: 'ดีเซล - อุปกรณ์ผลิตไฟฟ้า/ความร้อน', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'ลิตร' },
  { key: 's1StationaryGasolineLiters', label: 'เบนซิน - อุปกรณ์ผลิตไฟฟ้า/ความร้อน', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'ลิตร' },
  { key: 's1CookingLpgKg', label: 'แก๊สหุงต้ม LPG - ห้องครัว', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1VehicleDieselLiters', label: 'ดีเซล - ยานพาหนะ', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'ลิตร' },
  { key: 's1VehicleGasolineLiters', label: 'เบนซิน - ยานพาหนะ', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'ลิตร' },
  { key: 's1VehicleCngKg', label: 'NGV/CNG - ยานพาหนะ', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1FireExtCo2Kg', label: 'ถังดับเพลิง CO2', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1RefrigHfc134aKg', label: 'สารทำความเย็น HFC-134a', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1RefrigR22Kg', label: 'สารทำความเย็น R22', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1AnesthesiaN2oMl', label: 'แก๊สดมยาสลบ N2O', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มล.' },
  { key: 's1AnesthesiaIsoflurMl', label: 'แก๊สดมยาสลบ Isoflurane', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มล.' },
  { key: 's1AnesthesiaDesfluMl', label: 'แก๊สดมยาสลบ Desflurane', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มล.' },
  { key: 's1AnesthesiaSevoflurMl', label: 'แก๊สดมยาสลบ Sevoflurane', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มล.' },
  { key: 's1InfWasteAutoclaveKg', label: 'ขยะติดเชื้อบำบัดหม้อนึ่งอัดไอน้ำในหน่วยงาน', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 'sorganicWasteFermentKg', label: 'ขยะอินทรีย์ย่อยไร้อากาศ', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1OrganicWasteCompostKg', label: 'ขยะอินทรีย์หมักปุ๋ย', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'กก.' },
  { key: 's1WastewaterWaterM3', label: 'น้ำเสียที่บำบัด', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'ลบ.ม.' },
  { key: 's1WastewaterCodAnaerobicShallow', label: 'COD ไร้อากาศบ่อตื้น', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มก./ลิตร' },
  { key: 's1WastewaterCodAnaerobicDeep', label: 'COD ไร้อากาศบ่อลึก', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มก./ลิตร' },
  { key: 's1WastewaterCodAerobic', label: 'COD บำบัดแบบใช้อากาศ', scope: 'ขอบเขตที่ 1 (Scope 1 - Direct)', unit: 'มก./ลิตร' },

  // ขอบเขตที่ 2
  { key: 's2ElectricityKwh', label: 'ไฟฟ้าจากระบบสายส่ง', scope: 'ขอบเขตที่ 2 (Scope 2 - Indirect)', unit: 'kWh' },

  // ขอบเขตที่ 3
  { key: 's3WaterCubicM', label: 'น้ำประปา', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ลบ.ม.' },
  { key: 's3DetergentPowderKg', label: 'ผงซักฟอก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3LaundryLiquidMl', label: 'น้ำยาซักผ้า', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'มล.' },
  { key: 's3TonerCartridges', label: 'ตลับหมึกพิมพ์', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ตลับ' },
  { key: 's3PaperA4Reams', label: 'กระดาษ A4', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'รีม' },
  { key: 's3PlasticBagKg', label: 'ถุงพลาสติก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3GlovesLatexDlcsfogPcs', label: 'ถุงมือยางไม่มีแป้งชนิดปราศจากเชื้อ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesLatexDrofsogPcs', label: 'ถุงมือยางมีแป้งชนิดปราศจากเชื้อ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesNitrileEafPcs', label: 'ถุงมือยางไนไตร', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesNitrileDvbPcs', label: 'ถุงมือยางไนไตรแบบหนา', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesLatexDfofsogPcs', label: 'ถุงมือยางสังเคราะห์', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesLatexDlxfbogPcs', label: 'ถุงมือยางแบบไม่ปราศจากเชื้อ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3GlovesNitrileVbuPcs', label: 'ถุงมือไนไตรอื่นๆ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ชิ้น' },
  { key: 's3MasksBoxes', label: 'หน้ากากอนามัย', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3Amlodipine5mgBoxes', label: 'ยา Amlodipine 5mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3Amlodipine10mgBoxes', label: 'ยา Amlodipine 10mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3Deferiprone500mgBottles', label: 'ยา Deferiprone 500mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ขวด' },
  { key: 's3Gabapentin100mgBoxes', label: 'ยา Gabapentin 100mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3Gabapentin300mgBoxes', label: 'ยา Gabapentin 300mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3Omeprazole20mgBoxes', label: 'ยา Omeprazole 20mg', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กล่อง' },
  { key: 's3AlcoholMl', label: 'แอลกอฮอล์', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'มล.' },
  { key: 's3AmmoniaMl', label: 'แอมโมเนีย', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'มล.' },
  { key: 's3NaohKg', label: 'โซดาไฟ NaOH', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3AlumKg', label: 'สารส้ม Alum', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3SulfuricAcidKg', label: 'กรดซัลฟิวริก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3LimeKg', label: 'ปูนขาว Lime', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3ChlorineKg', label: 'คลอรีน', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3OutsourceDieselLiters', label: 'ดีเซลสำหรับรถขนส่งภายนอก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ลิตร' },
  { key: 's3OutsourceGasolineLiters', label: 'เบนซินสำหรับรถขนส่งภายนอก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'ลิตร' },
  { key: 's3GeneralWasteKg', label: 'ขยะทั่วไปฝังกลบ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3HazardousWasteLandfillKg', label: 'ขยะอันตรายฝังกลบ', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3HazardousWasteIncinKg', label: 'ขยะอันตรายเผาทำลาย', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3InfWasteIncinKg', label: 'ขยะติดเชื้อเผาทำลาย', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3InfWasteAutoclaveExtKg', label: 'ขยะติดเชื้อบำบัดด้วยไอน้ำภายนอก', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กก.' },
  { key: 's3TravelCarKm', label: 'ระยะเดินทางรถยนต์', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กม.' },
  { key: 's3TravelPlaneKm', label: 'ระยะเดินทางเครื่องบิน', scope: 'ขอบเขตที่ 3 (Scope 3 - Other)', unit: 'กม.' },

  // การลดหย่อน
  { key: 'redRecycledPaperKg', label: 'รีไซเคิล - กระดาษ', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redRecycledAluminumKg', label: 'รีไซเคิล - อลูมิเนียม', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redRecycledPlasticKg', label: 'รีไซเคิล - พลาสติก', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redRecycledIronKg', label: 'รีไซเคิล - เหล็ก', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redRecycledMetalKg', label: 'รีไซเคิล - โลหะอื่นๆ', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redRecycledGlassKg', label: 'รีไซเคิล - แก้ว', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redCompostFoodWasteKg', label: 'เศษอาหารทำปุ๋ยหมัก', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redCompostLeafBranchKg', label: 'เศษใบไม้กิ่งไม้ทำปุ๋ยหมัก', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redCompostElecKwh', label: 'ไฟฟ้าจากหมักแก๊สชีวภาพ', scope: 'การลดหย่อน (Reductions)', unit: 'kWh' },
  { key: 'redAnimalFeedKg', label: 'เศษอาหารเลี้ยงสัตว์', scope: 'การลดหย่อน (Reductions)', unit: 'กก.' },
  { key: 'redAnimalType', label: 'ประเภทสัตว์ที่ใช้เลี้ยง', scope: 'การลดหย่อน (Reductions)', unit: 'ข้อความ' },
  { key: 'redSolarUsedKwh', label: 'แสงอาทิตย์ (โซลาร์เซลล์มีมิเตอร์)', scope: 'การลดหย่อน (Reductions)', unit: 'kWh' },
  { key: 'redSolarMeteredKwh', label: 'แสงอาทิตย์ (โซลาร์เซลล์ผ่านมิเตอร์หลัก)', scope: 'การลดหย่อน (Reductions)', unit: 'kWh' },
  { key: 'redSolarPanelWatts', label: 'กำลังผลิตแผงโซลาร์', scope: 'การลดหย่อน (Reductions)', unit: 'วัตต์' },
  { key: 'redSolarPanelCount', label: 'จำนวนแผงโซลาร์', scope: 'การลดหย่อน (Reductions)', unit: 'แผง' },
  { key: 'redSolarDays', label: 'จำนวนวันใช้งานโซลาร์', scope: 'การลดหย่อน (Reductions)', unit: 'วัน' },
  { key: 'redSolarHasMeter', label: 'โซลาร์เซลล์มีมิเตอร์หรือไม่', scope: 'การลดหย่อน (Reductions)', unit: 'ข้อความ' },
  { key: 'redTreeCount', label: 'ต้นไม้ยืนต้นสะสม', scope: 'การลดหย่อน (Reductions)', unit: 'ต้น' },
  { key: 'redTelemedicineCo2e', label: 'ลด CO2 จาก Telemedicine', scope: 'การลดหย่อน (Reductions)', unit: 'kgCO2e' },
  { key: 'redOtherCo2e', label: 'กิจกรรมลดหย่อนอื่นๆ', scope: 'การลดหย่อน (Reductions)', unit: 'kgCO2e' },
  { key: 'redOtherDesc', label: 'รายละเอียดกิจกรรมลดหย่อนอื่นๆ', scope: 'การลดหย่อน (Reductions)', unit: 'ข้อความ' }
];

export const CarbonReportModal: React.FC<CarbonReportModalProps> = ({ isOpen, onClose }) => {
  const { payload, user } = useAuth();
  const { showToast } = useToast();
  
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;
  const isAdmin = payload?.roles.includes('Admin') || false;
  const userOrgId = payload?.organizationId || '';
  const userDeptId = payload?.departmentId || '';

  // Filter local states
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(''); // empty = all
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // empty = all
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Initialize and locks
  useEffect(() => {
    if (payload && isOpen) {
      if (!isSuperAdmin) {
        setSelectedOrgId(userOrgId);
        if (!isAdmin) {
          setSelectedDeptId(userDeptId);
        } else {
          setSelectedDeptId('');
        }
      } else {
        setSelectedOrgId('');
        setSelectedDeptId('');
      }
      setSelectedYear(String(CURRENT_CE_YEAR));
      setSelectedMonth('');
    }
  }, [payload, isSuperAdmin, isAdmin, userOrgId, userDeptId, isOpen]);

  // Load Organizations list for dropdown filter (SuperAdmin only)
  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['report-organizations-list'],
    queryFn: async () => {
      const res: any = await api.get('/organizations', { params: { limit: 100 } });
      return res.data ?? [];
    },
    enabled: isOpen && isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Load Departments list for cascading dropdown filter
  const { data: depts } = useQuery<DepartmentDto[]>({
    queryKey: ['report-departments-list', selectedOrgId],
    queryFn: async () => {
      const res: any = await api.get('/departments/all', {
        params: { organizationId: selectedOrgId || undefined }
      });
      return res.data ?? [];
    },
    enabled: isOpen && (isSuperAdmin || isAdmin) && !!selectedOrgId,
    staleTime: 5 * 60 * 1000,
  });

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch matching carbon records with a high limit (disable pagination client-side)
      const res: any = await api.get('/carbon-records', {
        params: {
          page: 1,
          limit: 100000,
          year: selectedYear ? parseInt(selectedYear, 10) : undefined,
          month: selectedMonth ? parseInt(selectedMonth, 10) : undefined,
          organizationId: selectedOrgId || undefined,
          departmentId: selectedDeptId || undefined,
          sortBy: 'year',
          sortOrder: 'desc'
        }
      });

      const records = res.data ?? [];
      
      if (records.length === 0) {
        showToast('ไม่พบข้อมูลบันทึกคาร์บอนตามเงื่อนไขที่เลือก', 'warning');
        setIsExporting(false);
        return;
      }

      // 2. Group records by (year, organization) for SuperAdmin cross-org reports,
      //    or by year only when a specific org/dept is already scoped.
      const shouldGroupByOrg = isSuperAdmin && !selectedOrgId && !selectedDeptId;

      // Label helpers — declare first so they can be referenced inside the grouping loop
      const orgLabel = isSuperAdmin 
        ? (selectedOrgId ? orgs?.find(o => o.id === selectedOrgId)?.name : 'ทุกองค์กร')
        : (user?.department?.organization?.name || 'องค์กรที่สังกัด');
      
      const deptLabel = selectedDeptId 
        ? (depts?.find(d => d.id === selectedDeptId)?.name || user?.department?.name || 'หน่วยงาน')
        : 'ทุกหน่วยงาน (ผลรวม)';
      
      const yearLabel = selectedYear ? `พ.ศ. ${parseInt(selectedYear, 10) + 543}` : 'ทุกปีงบประมาณ';
      const monthLabel = selectedMonth ? `เดือน_${MONTH_NAMES_TH[parseInt(selectedMonth, 10)]}` : 'ทุกเดือน';

      // groupKey => list of records
      const groupedRecords: { [key: string]: any[] } = {};
      // groupKey => metadata for sheet naming
      const groupMeta: { [key: string]: { yr: number; orgName: string } } = {};

      for (const rec of records) {
        const yr = rec.year;
        const orgName = rec.department?.organization?.name || orgLabel || 'ไม่ระบุองค์กร';
        const key = shouldGroupByOrg ? `${yr}__${rec.department?.organization?.id || ''}` : `${yr}`;
        if (!groupedRecords[key]) {
          groupedRecords[key] = [];
          groupMeta[key] = { yr, orgName };
        }
        groupedRecords[key].push(rec);
      }

      const workbook = XLSX.utils.book_new();
      
      // Sort groups: descending year, then org name A→Z
      const sortedKeys = Object.keys(groupedRecords).sort((a, b) => {
        const ma = groupMeta[a], mb = groupMeta[b];
        if (mb.yr !== ma.yr) return mb.yr - ma.yr;
        return ma.orgName.localeCompare(mb.orgName, 'th');
      });

      for (const groupKey of sortedKeys) {
        const groupRecords = groupedRecords[groupKey];
        const { yr, orgName: currentOrgName } = groupMeta[groupKey];
        const yearTh = yr + 543;
        
        const monthlyData: { [month: number]: { [key: string]: any } } = {};
        for (let m = 1; m <= 12; m++) {
          monthlyData[m] = {};
          for (const item of REPORT_ROWS) {
            if (item.key === 'redAnimalType' || item.key === 'redOtherDesc') {
              monthlyData[m][item.key] = [];
            } else if (item.key === 'redSolarHasMeter') {
              monthlyData[m][item.key] = [];
            } else {
              monthlyData[m][item.key] = 0;
            }
          }
        }

        for (const rec of groupRecords) {
          const m = rec.month;
          if (m >= 1 && m <= 12) {
            for (const item of REPORT_ROWS) {
              const val = rec[item.key];
              if (item.key === 'redAnimalType' || item.key === 'redOtherDesc') {
                if (val) {
                  monthlyData[m][item.key].push(String(val));
                }
              } else if (item.key === 'redSolarHasMeter') {
                if (val !== undefined && val !== null) {
                  monthlyData[m][item.key].push(val ? 'มีมิเตอร์' : 'ไม่มีมิเตอร์');
                }
              } else {
                monthlyData[m][item.key] += (Number(val) || 0);
              }
            }
          }
        }

        const columnsToRender: { monthIndex: number; label: string }[] = [];
        if (selectedMonth) {
          const mIdx = parseInt(selectedMonth, 10);
          columnsToRender.push({ monthIndex: mIdx, label: MONTH_NAMES_TH[mIdx] });
        } else {
          for (let m = 1; m <= 12; m++) {
            columnsToRender.push({ monthIndex: m, label: MONTH_NAMES_TH[m] });
          }
        }

        const currentYearLabel = `พ.ศ. ${yearTh}`;
        
        const aoaData: any[][] = [];
        const rowStyles: any[] = [];
        
        // Title/Metadata block as content headers
        aoaData.push(['รายงานคาร์บอนฟุตพริ้นท์']);
        rowStyles.push({ type: 'main_header' });

        aoaData.push([`องค์กร : ${shouldGroupByOrg ? currentOrgName : orgLabel}`]);
        rowStyles.push({ type: 'metadata' });

        aoaData.push([`หน่วยงาน : ${deptLabel}`]);
        rowStyles.push({ type: 'metadata' });

        aoaData.push([`ปีงบประมาณ : ${currentYearLabel}`]);
        rowStyles.push({ type: 'metadata' });

        aoaData.push([]); // Empty spacing
        rowStyles.push({ type: 'empty' });

        const tableHeaders = [
          'ประเภทกิจกรรม',
          'รายการ',
          'หน่วย',
          ...columnsToRender.map(c => c.label)
        ];
        
        const hasSummaryColumn = !selectedMonth;
        if (hasSummaryColumn) {
          tableHeaders.push('รวมทั้งหมด');
        }

        interface XlsxRowTemplateItem {
          type: 'scope_header' | 'section_header' | 'table_header' | 'data_row' | 'summary_row' | 'empty';
          text?: string;
          category?: string;
          item?: string;
          unit?: string;
          key?: string;
          keys?: string[];
        }

        const XLSX_ROWS_TEMPLATE: XlsxRowTemplateItem[] = [
          // ขอบเขตที่ 1
          { type: 'scope_header', text: 'ขอบเขตที่ 1 ' },
          { type: 'empty' },
          
          // การเผาไหม้อยู่กับที่
          { type: 'section_header', text: 'การเผาไหม้อยู่กลับที่ (Stationary Combustion)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การใช้น้ำมันเชื้อเพลิง', item: 'ปริมาณน้ำมันดีเซล (ในเครื่องจักร)', unit: 'ลิตร', key: 's1StationaryDieselLiters' },
          { type: 'data_row', category: 'การใช้น้ำมันเชื้อเพลิง', item: 'ปริมาณน้ำมันเบนซิน (ในเครื่องจักร)', unit: 'ลิตร', key: 's1StationaryGasolineLiters' },
          
          // การเผาไหม้แบบเคลื่อนที่
          { type: 'section_header', text: 'การเผาไหม้แบบเคลื่อนที่ (Mobile Combustion)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณน้ำมันดีเซล (ยานพาหนะขององค์กร)', unit: 'ลิตร', key: 's1VehicleDieselLiters' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณน้ำมันเบนซิน (ยานพาหนะขององค์กร)', unit: 'ลิตร', key: 's1VehicleGasolineLiters' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณ CNG (ยานพาหนะขององค์กร)', unit: 'กก.', key: 's1VehicleCngKg' },
          
          // การรั่วไหลและอื่นๆ
          { type: 'section_header', text: 'การรั่วไหลและอื่นๆ (Fugitive Emissions)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการใช้สารดับเพลิง (ชนิดคาร์บอนไดออกไซด์)', unit: 'กก.', key: 's1FireExtCo2Kg' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'สารทำความเย็น HFC-134a', unit: 'กก.', key: 's1RefrigHfc134aKg' },
          { type: 'data_row', category: 'การใช้ทรพยากร สาธารณูปโภค และอื่นๆ', item: 'สารทำความเย็น R22', unit: 'กก.', key: 's1RefrigR22Kg' },
          
          // การกำจัดมูลฝอยในองค์กร
          { type: 'section_header', text: 'การกำจัดมูลฝอยในองค์กร' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'มูลฝอยติดเชื้อ (ใช้ Autoclave)', unit: 'กก.', key: 's1InfWasteAutoclaveKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'มูลฝอยอินทรีย์ (ทำน้ำหมักชีวภาพ)', unit: 'กก.', key: 's1OrganicWasteFermentKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'มูลฝอยอินทรีย์ (ปุ๋ยหมักแบบไม่เติมอากาศ)', unit: 'กก.', key: 's1OrganicWasteCompostKg' },
          
          // การบำบัดน้ำเสีย
          { type: 'section_header', text: 'การบำบัดน้ำเสีย' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การบำบัดน้ำเสีย', item: 'ปริมาณน้ำที่เข้าระบบ', unit: 'ลบ.ม.', key: 's1WastewaterWaterM3' },
          { type: 'data_row', category: 'บำบัดแบบไม่เติมอากาศ', item: 'ค่า COD ของน้ำเสีย', unit: 'มก./ลิตร', keys: ['s1WastewaterCodAnaerobicShallow', 's1WastewaterCodAnaerobicDeep'] },
          { type: 'data_row', category: 'บำบัดแบบเติมอากาศ', item: 'ค่า COD ของน้ำเสีย', unit: 'มก./ลิตร', key: 's1WastewaterCodAerobic' },
          
          { type: 'empty' },
          
          // ขอบเขตที่ 2
          { type: 'scope_header', text: 'ขอบเขตที่ 2' },
          { type: 'empty' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การใช้ทรัพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการใช้ไฟฟ้าขององค์กร', unit: 'kWh', key: 's2ElectricityKwh' },
          
          { type: 'empty' },
          
          // ขอบเขตที่ 3
          { type: 'scope_header', text: 'ขอบเขตที่ 3' },
          { type: 'empty' },
          
          // การปล่อยก๊าซเรือนกระจกทางอ้อมจากการซื้อวัตถุดิบ และบริการ
          { type: 'section_header', text: 'การปล่อยก๊าซเรือนกระจกทางอ้อมจากการซื้อวัตถุดิบ และบริการ (Purchased goods and services)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การใช้ทรัพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการใช้น้ำประปา', unit: 'ลบ.ม.', key: 's3WaterCubicM' },
          { type: 'data_row', category: 'การใช้ทรัพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการเบิกหมึกพิมพ์', unit: 'ตลับ', key: 's3TonerCartridges' },
          { type: 'data_row', category: 'การใช้ทรัพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการเบิกกระดาษ A4', unit: 'รีม', key: 's3PaperA4Reams' },
          { type: 'data_row', category: 'การใช้ทรัพยากร สาธารณูปโภค และอื่นๆ', item: 'ปริมาณการใช้ถุงขยะ', unit: 'กก.', key: 's3PlasticBagKg' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ Alcohol (ชนิดน้ำ)', unit: 'มล.', key: 's3AlcoholMl' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ โซเดียมไฮดรอกไซด์', unit: 'กก.', key: 's3NaohKg' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ สารส้ม', unit: 'กก.', key: 's3AlumKg' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ กรดซันฟุริค', unit: 'กก.', key: 's3SulfuricAcidKg' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ ปูนขาว', unit: 'กก.', key: 's3LimeKg' },
          { type: 'data_row', category: 'การใช้สารเคม', item: 'ปริมาณการใช้ คลอรีน', unit: 'กก.', key: 's3ChlorineKg' },
          { type: 'data_row', category: 'การใช้น้ำมันเชื้อเพลิง', item: 'ปริมาณน้ำมันดีเซล (จ้างเหมาภายนอก)', unit: 'ลิตร', key: 's3OutsourceDieselLiters' },
          { type: 'data_row', category: 'การใช้น้ำมันเชื้อเพลิง', item: 'ปริมาณน้ำมันเบนซิน (จ้างมาภายนอก)', unit: 'ลิตร', key: 's3OutsourceGasolineLiters' },
          
          // การปล่อยก๊าซเรือนกระจกทางอ้อมจากการกำจัดของเสีย
          { type: 'section_header', text: 'การปล่อยก๊าซเรือนกระจกทางอ้อมจากการกำจัดของเสียที่เกิดจากการดำเนินกิจกรรมขององค์กร (Waste generated in operations)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'ปริมาณมูลฝอยทั่วไป (กำจัดภายนอก)', unit: 'กก.', key: 's3GeneralWasteKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'ปริมาณมูลฝอยอันตราย (กำจัดโดยการฝังกลบ)', unit: 'กก.', key: 's3HazardousWasteLandfillKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'ปริมาณมูลฝอยอันตราย (กำจัดโดยการเผา)', unit: 'กก.', key: 's3HazardousWasteIncinKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'ปริมาณมูลฝอยติดเชื้อ (กำจัดโดยการเผา)', unit: 'กก.', key: 's3InfWasteIncinKg' },
          { type: 'data_row', category: 'การกำจัดของเสีย', item: 'ปริมาณมูลฝอยติดเชื้อ (กำจัดโดยการ Autoclave)', unit: 'กก.', key: 's3InfWasteAutoclaveExtKg' },
          
          // การปล่อยก๊าซเรือนกระจกทางอ้อมจากการเดินทางเพื่อธุรกิจ
          { type: 'section_header', text: 'การปล่อยก๊าซเรือนกระจกทางอ้อมจากการเดินทางเพื่อธุรกิจ (Business travel)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'การเดินทาง', item: 'ระยะการเดินทางโดยเครื่องบิน ชั้นประหยัด (รวมขาไปและกลับ)', unit: 'กม.', key: 's3TravelPlaneKm' },
          
          { type: 'empty' },
          
          // กิจกรรมลดโลกร้อน
          { type: 'scope_header', text: 'กิจกรรมลดโลกร้อน' },
          { type: 'empty' },
          { type: 'section_header', text: 'การปล่อยก๊าซเรือนกระจกทางอ้อมจากการซื้อวัตถุดิบ และบริการ (Purchased goods and services)' },
          { type: 'table_header' },
          { type: 'data_row', category: 'ปริมาณพลังงานไฟฟ้าที่ใช้ในระบบผลิตไฟฟ้า', item: '', unit: '', key: '' },
          { type: 'data_row', category: 'ข้อมูลเกี่ยวกับ Solar cell', item: 'มีมิเตอร์', unit: '', key: 'redSolarUsedKwh' },
          { type: 'data_row', category: 'ข้อมูลเกี่ยวกับ Solar cell', item: 'ไม่มีมิเตอร์', unit: '', key: 'redSolarMeteredKwh' },
          { type: 'data_row', category: '', item: 'กำลังการผลิตของแผงเซลล์', unit: 'วัตต์', key: 'redSolarPanelWatts' },
          { type: 'data_row', category: '', item: 'จำนวนแผงเซลล์', unit: 'แผง', key: 'redSolarPanelCount' },
          { type: 'data_row', category: '', item: 'จำนวนวันที่ผลิตไฟฟ้าจากเซลล์', unit: 'วัน', key: 'redSolarDays' },
          
          { type: 'empty' },
          
          // สรุปภาพรวม
          { type: 'scope_header', text: 'สรุปภาพรวม (Summary)' },
          { type: 'empty' },
          { type: 'table_header' },
          { type: 'summary_row', category: 'ขอบเขตที่ 1 (Scope 1)', item: '', unit: 'kgCO2e', key: 'scope1Co2e' },
          { type: 'summary_row', category: 'ขอบเขตที่ 2 (Scope 2)', item: '', unit: 'kgCO2e', key: 'scope2Co2e' },
          { type: 'summary_row', category: 'ขอบเขตที่ 3 (Scope 3)', item: '', unit: 'kgCO2e', key: 'scope3Co2e' },
          { type: 'summary_row', category: 'ปริมาณการปล่อยก๊าซเรือนกระจกรวม (Total Emissions)', item: '', unit: 'kgCO2e', key: 'totalCo2e' },
          { type: 'summary_row', category: 'ปริมาณการลดหย่อนรวม (Total Reductions)', item: '', unit: 'kgCO2e', key: 'totalReducedCo2e' },
          { type: 'summary_row', category: 'การปล่อยก๊าซเรือนกระจกสุทธิ (Net Emissions)', item: '', unit: 'kgCO2e', key: 'netCo2e' }
        ];

        for (const rowTpl of XLSX_ROWS_TEMPLATE) {
          if (rowTpl.type === 'scope_header') {
            aoaData.push([rowTpl.text]);
            rowStyles.push({ type: 'scope_header' });
          } else if (rowTpl.type === 'section_header') {
            aoaData.push([rowTpl.text]);
            rowStyles.push({ type: 'section_header' });
          } else if (rowTpl.type === 'empty') {
            aoaData.push([]);
            rowStyles.push({ type: 'empty' });
          } else if (rowTpl.type === 'table_header') {
            aoaData.push(tableHeaders);
            rowStyles.push({ type: 'table_header' });
          } else if (rowTpl.type === 'data_row' || rowTpl.type === 'summary_row') {
            const rowVals: any[] = [rowTpl.category || '', rowTpl.item || '', rowTpl.unit || ''];
            const monthVals: any[] = [];
            let rowSum = 0;
            const isTextKey = rowTpl.key === 'redAnimalType' || rowTpl.key === 'redOtherDesc' || rowTpl.key === 'redSolarHasMeter';

            for (const col of columnsToRender) {
              let cellVal: any = '';
              if (rowTpl.keys) {
                cellVal = rowTpl.keys.reduce((sum: number, k: string) => sum + (Number(monthlyData[col.monthIndex][k]) || 0), 0);
              } else if (rowTpl.key) {
                cellVal = monthlyData[col.monthIndex][rowTpl.key];
              } else {
                monthVals.push('');
                continue;
              }

              if (isTextKey) {
                const uniqueTexts = Array.from(new Set(cellVal as string[] || []));
                monthVals.push(uniqueTexts.join(', '));
              } else {
                const numVal = Number(cellVal) || 0;
                rowSum += numVal;
                const formattedVal = numVal % 1 === 0 ? numVal : Math.round(numVal * 100) / 100;
                monthVals.push(formattedVal);
              }
            }

            rowVals.push(...monthVals);

            if (hasSummaryColumn) {
              if (!rowTpl.key && !rowTpl.keys) {
                rowVals.push('');
              } else if (isTextKey) {
                const allTextValues: string[] = [];
                for (const col of columnsToRender) {
                  let cellVal = [];
                  if (rowTpl.key) {
                    cellVal = monthlyData[col.monthIndex][rowTpl.key] || [];
                  }
                  cellVal.forEach((t: string) => { if (t) allTextValues.push(t); });
                }
                const uniqueAllTexts = Array.from(new Set(allTextValues));
                rowVals.push(uniqueAllTexts.join(', '));
              } else {
                const formattedSum = rowSum % 1 === 0 ? rowSum : Math.round(rowSum * 100) / 100;
                rowVals.push(formattedSum);
              }
            }

            aoaData.push(rowVals);
            rowStyles.push({ type: rowTpl.type });
          }
        }

        // Convert to sheet
        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        
        // Auto-fit column widths
        const colWidths = tableHeaders.map((_, colIndex) => {
          let maxLen = 10;
          for (let rowIndex = 0; rowIndex < aoaData.length; rowIndex++) {
            const val = aoaData[rowIndex][colIndex];
            if (val !== undefined && val !== null) {
              const valStr = String(val);
              const len = valStr.length;
              if (len > maxLen) {
                maxLen = len;
              }
            }
          }
          return { wch: Math.min(Math.max(maxLen + 4, 12), 50) };
        });
        ws['!cols'] = colWidths;

        // Apply styles to worksheet cells
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        const thinBorder = { style: 'thin', color: { rgb: 'CBD5E0' } };
        const doubleBorder = { style: 'double', color: { rgb: '718096' } };
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const rowStyle = rowStyles[R];
          if (!rowStyle) continue;
          
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            let cell = ws[cellRef];
            
            if (!cell) {
              if (['scope_header', 'section_header', 'table_header', 'summary_row'].includes(rowStyle.type)) {
                ws[cellRef] = { t: 's', v: '' };
                cell = ws[cellRef];
              } else {
                continue;
              }
            }
            
            cell.s = {};
            
            if (rowStyle.type === 'main_header') {
              cell.s.font = { name: 'Aptos', size: 16, bold: true, color: { rgb: '1B365D' } };
            } else if (rowStyle.type === 'metadata') {
              cell.s.font = { name: 'Aptos', size: 11, bold: true, color: { rgb: '4A5568' } };
            } else if (rowStyle.type === 'scope_header') {
              cell.s.fill = { fgColor: { rgb: '1F3A60' } };
              cell.s.font = { name: 'Aptos', size: 12, bold: true, color: { rgb: 'FFFFFF' } };
              cell.s.alignment = { vertical: 'center' };
            } else if (rowStyle.type === 'section_header') {
              cell.s.fill = { fgColor: { rgb: 'E8EEF5' } };
              cell.s.font = { name: 'Aptos', size: 11, bold: true, color: { rgb: '2D3748' } };
              cell.s.alignment = { vertical: 'center' };
              cell.s.border = {
                top: thinBorder,
                bottom: thinBorder
              };
            } else if (rowStyle.type === 'table_header') {
              cell.s.fill = { fgColor: { rgb: '319795' } };
              cell.s.font = { name: 'Aptos', size: 11, bold: true, color: { rgb: 'FFFFFF' } };
              cell.s.alignment = { 
                horizontal: C >= 3 ? 'center' : 'left', 
                vertical: 'center',
                wrapText: true
              };
              cell.s.border = {
                top: thinBorder,
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder
              };
            } else if (rowStyle.type === 'data_row') {
              const isEven = R % 2 === 0;
              cell.s.fill = { fgColor: { rgb: isEven ? 'F7FAFC' : 'FFFFFF' } };
              cell.s.font = { name: 'Aptos', size: 11 };
              cell.s.alignment = { 
                horizontal: C === 2 ? 'center' : (C >= 3 ? 'right' : 'left'),
                vertical: 'center'
              };
              cell.s.border = {
                bottom: thinBorder,
                left: thinBorder,
                right: thinBorder
              };
            } else if (rowStyle.type === 'summary_row') {
              cell.s.fill = { fgColor: { rgb: 'FEF3C7' } };
              cell.s.font = { name: 'Aptos', size: 11, bold: true, color: { rgb: '78350F' } };
              cell.s.alignment = { 
                horizontal: C === 2 ? 'center' : (C >= 3 ? 'right' : 'left'),
                vertical: 'center'
              };
              cell.s.border = {
                top: thinBorder,
                bottom: doubleBorder,
                left: thinBorder,
                right: thinBorder
              };
            }
          }
        }

        // Sheet name: 'ปีงบประมาณ_YYYY' or 'YYYY_ชื่อองค์กร' for SuperAdmin cross-org
        const rawSheetName = shouldGroupByOrg
          ? `${yearTh}_${currentOrgName}`.substring(0, 31)
          : `ปีงบประมาณ_${yearTh}`;
        // Excel sheet names cannot exceed 31 chars and must not have special chars
        const sheetName = rawSheetName.replace(/[\\\/:*?"<>|\[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      }

      // Write array buffer
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      const fileName = `รายงานคาร์บอนฟุตพริ้นท์_${orgLabel}_${deptLabel}_${selectedYear ? 'ปี_' + (parseInt(selectedYear, 10) + 543) : yearLabel}_${monthLabel}.xlsx`
        .replace(/[\\\/:*?"<>|\s]/g, '_');

      // 3. Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Delay cleanup to ensure browser registers the download attribute
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);
      
      showToast('ส่งออกรายงาน Excel สำเร็จ', 'success');
      onClose();
    } catch (e: any) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการส่งออกรายงาน', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md bg-white text-slate-800 z-10 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">ส่งออกรายงาน Excel</h3>
              <p className="text-xs text-slate-500">เลือกช่วงเวลาและขอบเขตหน่วยงานที่ต้องการส่งออก</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Organization filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">องค์กร</label>
            {isSuperAdmin ? (
              <Select2
                value={selectedOrgId}
                onChange={val => {
                  setSelectedOrgId(val);
                  setSelectedDeptId('');
                }}
                options={[
                  { value: '', label: 'ทุกองค์กร' },
                  ...(orgs?.map(o => ({ value: o.id, label: o.name })) ?? [])
                ]}
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 font-semibold font-sans">
                {user?.department?.organization?.name || 'องค์กรที่สังกัด'}
              </div>
            )}
          </div>

          {/* Department filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">หน่วยงาน / กลุ่มงาน</label>
            {isSuperAdmin || isAdmin ? (
              <Select2
                disabled={isSuperAdmin && !selectedOrgId}
                value={selectedDeptId}
                onChange={setSelectedDeptId}
                options={[
                  { value: '', label: 'ทุกหน่วยงาน' },
                  ...(depts?.map(d => ({ value: d.id, label: d.name })) ?? [])
                ]}
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 font-semibold font-sans">
                {user?.department?.name || 'หน่วยงานที่สังกัด'}
              </div>
            )}
          </div>

          {/* Year filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">ปีงบประมาณ</label>
            <Select2
              value={selectedYear}
              onChange={setSelectedYear}
              options={[
                { value: '', label: 'ทุกปีงบประมาณ' },
                ...CE_YEAR_OPTIONS.map(y => ({ value: String(y), label: `พ.ศ. ${y + 543}` }))
              ]}
            />
          </div>

          {/* Month filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">เดือน</label>
            <Select2
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={MONTH_NAMES_TH.map((m, idx) => ({
                value: idx === 0 ? '' : String(idx),
                label: m
              }))}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm min-w-[130px]"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} />
                ส่งออก Excel
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
