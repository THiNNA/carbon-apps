import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { X, Save, Sparkles, Copy, Loader2, Info } from 'lucide-react';
import type { OrganizationDto } from '@enterprise/shared-types';
import { Select2 } from '../../components/select2.js';


interface EmissionFactorFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  year: number | null;
  organizationId: string | null;
  currentUserOrgId?: string | null;
  isSuperAdmin: boolean;
  onClose: () => void;
}

const SYSTEM_START_YEAR = 2024; // ปีที่เริ่มเก็บข้อมูล ค.ศ. (ตรงกับ พ.ศ. 2567)
const CURRENT_CE_YEAR = new Date().getFullYear();
const FISCAL_YEARS = Array.from(
  { length: Math.max(3, CURRENT_CE_YEAR - SYSTEM_START_YEAR + 1) },
  (_, i) => Math.max(CURRENT_CE_YEAR, 2026) - i
); // รับประกันมีอย่างน้อย 3 ปีเสมอ (2026, 2025, 2024) ป้องกัน array ว่าง

const TABS = [
  { id: 'general', label: 'ข้อมูลทั่วไป' },
  { id: 'scope1', label: 'Scope 1 (ทางตรง)' },
  { id: 'scope2', label: 'Scope 2 (ไฟฟ้า)' },
  { id: 'scope3', label: 'Scope 3 (ทางอ้อม)' },
  { id: 'reduction', label: 'Reduction (การลดก๊าซ)' }
];

const DEFAULT_FACTORS_MAP: Record<string, { category: string; name: string; value: number; unit: string; source: string; sourceUrl: string }> = {
  s1StationaryDiesel: { category: 'scope1', name: 'น้ำมันดีเซลสำหรับเครื่องจักร', value: 2.7078, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1StationaryGasoline: { category: 'scope1', name: 'น้ำมันเบนซินสำหรับเครื่องจักร', value: 2.1894, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1CookingLpg: { category: 'scope1', name: 'แก๊สหุงต้ม LPG', value: 3.1134, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1VehicleDiesel: { category: 'scope1', name: 'น้ำมันดีเซลสำหรับยานพาหนะ', value: 2.7406, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1VehicleGasoline: { category: 'scope1', name: 'น้ำมันเบนซินสำหรับยานพาหนะ', value: 2.2394, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1VehicleCng: { category: 'scope1', name: 'ก๊าซธรรมชาติ CNG สำหรับยานพาหนะ', value: 2.2609, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1FireExtCo2: { category: 'scope1', name: 'ถังดับเพลิง CO2', value: 1.0, unit: 'kgCO2e/กก.', source: 'IPCC AR5 — Global Warming Potential (GWP100): CO2 = 1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
  s1RefrigHfc134a: { category: 'scope1', name: 'สารทำความเย็น HFC-134a', value: 1300.0, unit: 'kgCO2e/กก.', source: 'IPCC AR5 — Global Warming Potential (GWP100): HFC-134a = 1,300', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
  s1RefrigR22: { category: 'scope1', name: 'สารทำความเย็น R22', value: 1760.0, unit: 'kgCO2e/กก.', source: 'IPCC AR5 — Global Warming Potential (GWP100): HCFC-22 = 1,760', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
  s1AnesthesiaN2o: { category: 'scope1', name: 'ยาสลบไนตรัสออกไซด์ (N2O)', value: 0.3249, unit: 'kgCO2e/มล.', source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012), IPCC AR5 N2O GWP = 265', sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/' },
  s1AnesthesiaIsoflur: { category: 'scope1', name: 'ยาสลบ Isoflurane', value: 0.816, unit: 'kgCO2e/มล.', source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)', sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/' },
  s1AnesthesiaDesflu: { category: 'scope1', name: 'ยาสลบ Desflurane', value: 3.6805, unit: 'kgCO2e/มล.', source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)', sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/' },
  s1AnesthesiaSevoflur: { category: 'scope1', name: 'ยาสลบ Sevoflurane', value: 0.2196, unit: 'kgCO2e/มล.', source: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)', sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/' },
  s1InfWasteAutoclave: { category: 'scope1', name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายใน', value: 0.243, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1OrganicWasteFerment: { category: 'scope1', name: 'ขยะอินทรีย์หมักภายใน', value: 0.3338, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s1OrganicWasteCompost: { category: 'scope1', name: 'ขยะอินทรีย์ปุ๋ยหมักภายใน', value: 0.1102, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s2Electricity: { category: 'scope2', name: 'การใช้ไฟฟ้ากระแสไฟฟ้า', value: 0.5781, unit: 'kgCO2e/kWh', source: 'กฟผ. / อบก. — ค่า Grid Emission Factor ไฟฟ้าจากระบบสายส่ง (ประเทศไทย)', sourceUrl: 'https://www.egat.co.th/index.php?option=com_content&view=article&id=5&Itemid=117' },
  s3Water: { category: 'scope3', name: 'การใช้น้ำประปา', value: 0.5411, unit: 'kgCO2e/ลบ.ม.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการใช้น้ำประปา', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3PaperA4: { category: 'scope3', name: 'การเบิกกระดาษ A4', value: 5.254, unit: 'kgCO2e/รีม', source: 'GHG Protocol — Paper Supply Chain Emission Factor', sourceUrl: 'https://ghgprotocol.org/scope-3-technical-calculation-guidance' },
  s3PlasticBag: { category: 'scope3', name: 'การใช้ถุงขยะพลาสติก', value: 6.707, unit: 'kgCO2e/กก.', source: 'DEFRA UK — Conversion Factors for Plastic Products', sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023' },
  s3OutsourceDiesel: { category: 'scope3', name: 'น้ำมันดีเซลจ้างเหมาขนส่ง', value: 2.7406, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3OutsourceGasoline: { category: 'scope3', name: 'น้ำมันเบนซินจ้างเหมาขนส่ง', value: 2.2394, unit: 'kgCO2e/ลิตร', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3GeneralWasteLandfill: { category: 'scope3', name: 'ขยะทั่วไปฝังกลบภายนอก', value: 0.5, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ / IPCC Waste', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3HazardousWasteLandfill: { category: 'scope3', name: 'ขยะอันตรายฝังกลบภายนอก', value: 0.5, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3HazardousWasteIncin: { category: 'scope3', name: 'ขยะอันตรายเผาภายนอก', value: 0.5, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3InfWasteIncin: { category: 'scope3', name: 'ขยะติดเชื้อเผาภายนอก', value: 0.5, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3InfWasteAutoclaveExt: { category: 'scope3', name: 'ขยะติดเชื้อ อบฆ่าเชื้อภายนอก', value: 0.243, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการจัดการขยะ', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  s3TravelCar: { category: 'scope3', name: 'การเดินทางด้วยรถยนต์ส่วนตัว/องค์กร', value: 0.168, unit: 'kgCO2e/กม.', source: 'DEFRA UK — GHG Conversion Factors for Company Reporting (Car)', sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023' },
  s3TravelPlane: { category: 'scope3', name: 'การเดินทางด้วยเครื่องบินชั้นประหยัด', value: 0.1539, unit: 'kgCO2e/กม.', source: 'DEFRA UK — GHG Conversion Factors for Company Reporting (Domestic/Short-haul Economy)', sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023' },
  compostFoodWaste: { category: 'reduction', name: 'ปุ๋ยหมักเศษอาหาร', value: 0.43, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าการลดการปล่อยก๊าซเรือนกระจกจากการทำปุ๋ยหมัก', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  compostLeafBranch: { category: 'reduction', name: 'ปุ๋ยหมักกิ่งไม้ใบไม้', value: 0.1102, unit: 'kgCO2e/กก.', source: 'อบก. — ค่าการลดการปล่อยก๊าซเรือนกระจกจากการทำปุ๋ยหมัก', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' },
  solarElectricity: { category: 'reduction', name: 'การผลิตไฟฟ้า Solar Cell', value: 0.5781, unit: 'kgCO2e/kWh', source: 'กฟผ. / อบก. — ค่า Grid Emission Factor (ใช้ค่าเดียวกับไฟฟ้า Scope 2)', sourceUrl: 'https://www.egat.co.th/index.php?option=com_content&view=article&id=5&Itemid=117' },
  treePerYear: { category: 'reduction', name: 'การดูดกลับคาร์บอนของไม้ยืนต้น', value: 3.67, unit: 'kgCO2e/ต้น/ปี', source: 'อบก. — ค่าการดูดกลับก๊าซคาร์บอนไดออกไซด์ของต้นไม้ในประเทศไทย', sourceUrl: 'https://www.tgo.or.th/2020/index.php/th/' }
};

export const EmissionFactorFormModal: React.FC<EmissionFactorFormModalProps> = ({
  isOpen,
  mode,
  year,
  organizationId,
  currentUserOrgId,
  isSuperAdmin,
  onClose
}) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('general');
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_CE_YEAR);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [factorsState, setFactorsState] = useState<Record<string, number>>({});
  const [isCloning, setIsCloning] = useState(false);
  const [cloneFromYear, setCloneFromYear] = useState<number>(CURRENT_CE_YEAR - 1);
  const [cloneFromOrgId, setCloneFromOrgId] = useState<string>('');

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  // Load organizations (รวม System org เสมอเพื่อนำมาใช้ในเครื่องมือคัดลอก)
  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-list-dropdown'],
    queryFn: async () => {
      const res: any = await api.get('/organizations', {
        params: { includeSystem: 'true' }
      });
      return res.data ?? [];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });


  // Set default values based on mode / current user
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      if (isCreate) {
        setSelectedYear(CURRENT_CE_YEAR);
        if (!isSuperAdmin && currentUserOrgId) {
          setSelectedOrgId(currentUserOrgId);
        } else if (orgs && orgs.length > 0) {
          // ข้าม SYSTEM org ไปก่อน เพื่อให้ค่า default เป็นองค์กรปกติ
          const defaultOrg = orgs.find(o => o.code !== 'SYSTEM' && !(o as any).isSystem) || orgs[0];
          setSelectedOrgId(defaultOrg.id);
        } else {
          setSelectedOrgId('');
        }

        // Initialize state as blank (0) — ผู้ใช้ต้องกด "โหลดค่ามาตรฐาน" หรือ "คัดลอก" เองเท่านั้น
        const initial: Record<string, number> = {};
        Object.keys(DEFAULT_FACTORS_MAP).forEach(k => {
          initial[k] = 0;
        });
        setFactorsState(initial);
      } else {
        if (year) setSelectedYear(year);
        if (organizationId) setSelectedOrgId(organizationId);
      }
    }
  }, [isOpen, mode, year, organizationId, currentUserOrgId, isSuperAdmin, orgs]);

  // Load factors for selected year/org
  const targetQueryYear = isCreate ? selectedYear : (year ?? selectedYear);
  const targetQueryOrgId = isCreate ? selectedOrgId : (organizationId ?? selectedOrgId);

  const { data: dbFactors, isLoading: isLoadingFactors } = useQuery({
    queryKey: ['emission-factors-detail', targetQueryYear, targetQueryOrgId],
    queryFn: async () => {
      if (!targetQueryYear || !targetQueryOrgId) return [];
      const res: any = await api.get('/emission-factors', {
        params: { year: targetQueryYear, organizationId: targetQueryOrgId }
      });
      return res.data ?? [];
    },
    enabled: isOpen && !!targetQueryYear && !!targetQueryOrgId && !isCreate
  });

  // Populate factorsState when dbFactors loaded
  useEffect(() => {
    if (dbFactors && dbFactors.length > 0 && !isCreate) {
      const state: Record<string, number> = {};
      // Populate defaults first
      Object.keys(DEFAULT_FACTORS_MAP).forEach(k => {
        state[k] = DEFAULT_FACTORS_MAP[k].value;
      });
      // Override with DB values
      dbFactors.forEach((f: any) => {
        state[f.key] = f.value;
      });
      setFactorsState(state);
    } else if (dbFactors && dbFactors.length === 0 && !isCreate) {
      // Empty, load frontend defaults
      const initial: Record<string, number> = {};
      Object.keys(DEFAULT_FACTORS_MAP).forEach(k => {
        initial[k] = DEFAULT_FACTORS_MAP[k].value;
      });
      setFactorsState(initial);
    }
  }, [dbFactors, isCreate]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const yearVal = isCreate ? selectedYear : (year!);
      const orgIdVal = isCreate ? selectedOrgId : (organizationId!);

      const factorsPayload = Object.keys(factorsState).map(key => ({
        key,
        value: Number(factorsState[key])
      }));

      if (isCreate) {
        // 1. Initialize factors first (to generate standard rows in DB if they don't exist)
        await api.post('/emission-factors/initialize', { year: yearVal, organizationId: orgIdVal });
      }

      // 2. Perform bulk-update with the values from UI
      return api.post('/emission-factors/bulk-update', {
        year: yearVal,
        organizationId: orgIdVal,
        factors: factorsPayload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-groups'] });
      queryClient.invalidateQueries({ queryKey: ['emission-factors-list'] });
      showToast(isCreate ? 'สร้างสูตรคำนวณรายปีสำเร็จ' : 'บันทึกการแก้ไขสำเร็จ', 'success');
      onClose();
    },
    onError: (e: any) => {
      showToast(e.response?.data?.message || e.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  });

  // Handle Input Change
  const handleInputChange = (key: string, value: string) => {
    setFactorsState(prev => ({
      ...prev,
      [key]: value === '' ? 0 : Number(value)
    }));
  };



  // Handle Clone Click
  const handleClone = async () => {
    if (!cloneFromYear || !cloneFromOrgId) {
      showToast('กรุณาเลือกปีและองค์กรต้นทาง', 'error');
      return;
    }
    setIsCloning(true);
    try {
      const yearVal = isCreate ? selectedYear : (year!);
      const orgIdVal = isCreate ? selectedOrgId : (organizationId!);

      await api.post('/emission-factors/clone', {
        fromYear: cloneFromYear,
        fromOrgId: cloneFromOrgId,
        toYear: yearVal,
        toOrgId: orgIdVal
      });

      // Reload
      queryClient.invalidateQueries({
        queryKey: ['emission-factors-detail', yearVal, orgIdVal]
      });

      // If create mode, we need to load cloned data into state
      const res: any = await api.get('/emission-factors', {
        params: { year: yearVal, organizationId: orgIdVal }
      });
      const cloned = res.data ?? [];
      const state: Record<string, number> = {};
      Object.keys(DEFAULT_FACTORS_MAP).forEach(k => {
        state[k] = DEFAULT_FACTORS_MAP[k].value;
      });
      cloned.forEach((f: any) => {
        state[f.key] = f.value;
      });
      setFactorsState(state);

      showToast('คัดลอกข้อมูลสำเร็จ', 'success');
    } catch (e: any) {
      showToast(e.response?.data?.message || e.message || 'เกิดข้อผิดพลาดในการคัดลอก', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  if (!isOpen) return null;

  // Filter keys by category
  const getKeysByCategory = (category: string) => {
    return Object.keys(DEFAULT_FACTORS_MAP).filter(
      k => DEFAULT_FACTORS_MAP[k].category === category
    );
  };

  const renderDataInputRow = (key: string) => {
    const factorInfo = DEFAULT_FACTORS_MAP[key];
    if (!factorInfo) return null;

    const val = factorsState[key] ?? 0;

    return (
      <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{factorInfo.name}</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">{key}</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal flex items-start gap-1">
            <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
            <span>แหล่งอ้างอิง: {factorInfo.source}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <input
            type="number"
            step="any"
            disabled={isView}
            value={val === 0 ? '' : val}
            placeholder="0.0000"
            onChange={e => handleInputChange(key, e.target.value)}
            className="w-32 px-3 py-2 text-right text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono font-bold bg-white disabled:bg-slate-100 disabled:text-slate-500"
          />
          <span className="text-xs text-slate-400 font-mono w-24 shrink-0">{factorInfo.unit}</span>
        </div>
      </div>
    );
  };

  const isSaving = saveMutation.isPending;
  const isLoading = !isCreate && isLoadingFactors;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative rounded-2xl shadow-2xl w-full max-w-5xl bg-white text-slate-800 z-10 flex flex-col overflow-hidden max-h-[90vh] border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-400 fill-emerald-400/10" size={24} />
            <div>
              <h3 className="font-bold text-lg">
                {isView ? 'แสดงรายละเอียดค่าสัมประสิทธิ์' : isEdit ? 'แก้ไขค่าสัมประสิทธิ์การปล่อยก๊าซ' : 'เพิ่มสูตรค่าสัมประสิทธิ์รายปี'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isCreate
                  ? 'สร้างชุดสัมประสิทธิ์ (Emission Factors) รายปีและองค์กร'
                  : `ปี (พ.ศ.) ${selectedYear + 543} | ${orgs?.find(o => o.id === selectedOrgId)?.name || 'กำลังโหลด...'}`
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={30} />
              <span className="text-sm animate-pulse font-bold text-slate-500">กำลังดึงข้อมูล...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Layout Body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="md:w-56 bg-slate-50 border-r border-slate-200 p-3 space-y-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap md:whitespace-normal ${activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 min-w-0 bg-slate-50/20">
                {/* Tab: ข้อมูลทั่วไป */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">ข้อมูลกำหนดขอบเขต</h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Year Picker */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">ปี (พ.ศ.)</label>
                          <Select2
                            disabled={!isCreate}
                            value={selectedYear}
                            onChange={val => setSelectedYear(Number(val))}
                            options={FISCAL_YEARS.map(y => ({ value: String(y), label: `${y + 543}` }))}
                          />
                        </div>

                        {/* Org Picker */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">หน่วยงาน / องค์กร</label>
                          <Select2
                            disabled={!isCreate || (!isSuperAdmin && !!currentUserOrgId)}
                            value={selectedOrgId}
                            onChange={val => setSelectedOrgId(val)}
                            options={
                              isSuperAdmin
                                ? (orgs?.map(o => ({ value: o.id, label: o.name })) ?? [])
                                : (orgs?.filter(o => o.code !== 'SYSTEM' && !(o as any).isSystem).map(o => ({ value: o.id, label: o.name })) ?? [])
                            }
                          />
                        </div>

                      </div>
                    </div>

                    {/* Clone / Defaults Tools */}
                    {!isView && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
                          <Copy size={16} className="text-slate-500" />
                          เครื่องมือคัดลอก / รีเซ็ตข้อมูลเริ่มต้น
                        </h4>

                        <div className="space-y-4">
                          {/* Clone Form */}
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                            <p className="text-xs font-semibold text-slate-700">คัดลอกค่าสัมประสิทธิ์จากปี (พ.ศ.) อื่น:</p>
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="flex-2">
                                <label className="block text-[10px] text-slate-500 mb-1">จากปี (พ.ศ.)</label>
                                <Select2
                                  value={cloneFromYear}
                                  onChange={val => setCloneFromYear(Number(val))}
                                  options={FISCAL_YEARS.map(y => ({ value: String(y), label: `${y + 543}` }))}
                                  className="w-full"
                                  openUp={true}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 mb-1">จากองค์กร</label>
                                <Select2
                                  value={cloneFromOrgId}
                                  onChange={val => setCloneFromOrgId(val)}
                                  placeholder="-- กรุณาเลือกองค์กร --"
                                  options={orgs?.map(o => ({ value: o.id, label: o.name })) ?? []}
                                  className="w-full"
                                  openUp={true}
                                />
                              </div>

                              <button
                                type="button"
                                disabled={isCloning}
                                onClick={handleClone}
                                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 flex items-center gap-1.5 h-[34px]"
                              >
                                {isCloning ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                คัดลอกค่า
                              </button>
                            </div>
                          </div>

                          {/* Default reset */}
                          {/*<div className="flex justify-between items-center bg-violet-50/50 border border-violet-100 rounded-xl p-4">
                            <div>
                              <p className="text-xs font-bold text-violet-800">โหลดค่ามาตรฐานเริ่มต้นของระบบ</p>
                              <p className="text-[11px] text-violet-600 mt-0.5">ใช้ค่าสัมประสิทธิ์มาตรฐานของ อบก. / IPCC ทั้งหมดเป็นค่าตั้งต้นในหน้าจอ</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleLoadDefaults}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5"
                            >
                              <Sparkles size={13} /> โหลดค่ามาตรฐาน
                            </button>
                          </div>*/}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Scope 1 */}
                {activeTab === 'scope1' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🏭 ขอบเขตที่ 1 — การปล่อยก๊าซเรือนกระจกทางตรง</h4>
                    {getKeysByCategory('scope1').map(renderDataInputRow)}
                  </div>
                )}

                {/* Tab: Scope 2 */}
                {activeTab === 'scope2' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">⚡ ขอบเขตที่ 2 — พลังงานไฟฟ้า (ทางอ้อม)</h4>
                    {getKeysByCategory('scope2').map(renderDataInputRow)}
                  </div>
                )}

                {/* Tab: Scope 3 */}
                {activeTab === 'scope3' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">💧 ขอบเขตที่ 3 — การปล่อยก๊าซเรือนกระจกทางอ้อมอื่นๆ</h4>
                    {getKeysByCategory('scope3').map(renderDataInputRow)}
                  </div>
                )}

                {/* Tab: Reduction */}
                {activeTab === 'reduction' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🌱 การดูดกลับและการลดก๊าซเรือนกระจก</h4>
                    {getKeysByCategory('reduction').map(renderDataInputRow)}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end shrink-0 border-t border-slate-200 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {isView ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
              </button>

              {!isView && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => saveMutation.mutate()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 font-bold"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {isCreate ? 'บันทึกสร้างใหม่' : 'บันทึกการแก้ไข'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
