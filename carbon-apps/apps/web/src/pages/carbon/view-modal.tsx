import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import type { CarbonRecordDto } from '@enterprise/shared-types';
import { X, Leaf, Calculator, Building2, Calendar, FileText } from 'lucide-react';

interface CarbonRecordViewModalProps {
  isOpen: boolean;
  recordId: string | null;
  onClose: () => void;
}

const MONTH_NAMES_TH = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const fmt = (v: number | undefined | null) => (v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CarbonRecordViewModal: React.FC<CarbonRecordViewModalProps> = ({ isOpen, recordId, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const { data: record, isLoading } = useQuery<CarbonRecordDto>({
    queryKey: ['carbon-record-detail', recordId],
    queryFn: async () => {
      if (!recordId) return null as any;
      const res: any = await api.get(`/carbon-records/${recordId}`);
      return res.data;
    },
    enabled: isOpen && !!recordId,
  });

  if (!isOpen) return null;

  const TABS = ['ข้อมูลทั่วไป', 'ขอบเขตที่ 1', 'ขอบเขตที่ 2', 'ขอบเขตที่ 3', 'ลดก๊าซเรือนกระจก'];

  const renderDataRow = (label: string, value: number | string | undefined | null, unit: string) => {
    const isNum = typeof value === 'number';
    const isEmpty = value === undefined || value === null || (isNum && value === 0);
    return (
      <div className={`flex justify-between py-2.5 border-b border-slate-100 text-sm ${isEmpty ? 'text-slate-400 opacity-60' : 'text-slate-700'}`}>
        <span className="font-medium">{label}</span>
        <div className="font-mono">
          <span className={isEmpty ? '' : 'font-bold text-slate-900'}>
            {isNum ? fmt(value as number) : (value || '-')}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">{unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative rounded-2xl shadow-2xl w-full max-w-4xl bg-white text-slate-800 z-10 flex flex-col overflow-hidden max-h-[85vh] border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Leaf className="text-emerald-400 fill-emerald-400/10" size={24} />
            <div>
              <h3 className="font-bold text-lg">รายละเอียดข้อมูลบันทึกคาร์บอน</h3>
              {/* <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {recordId}</p> */}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <span className="text-xl animate-pulse font-bold text-slate-500">กำลังดึงข้อมูล...</span>
            </div>
          </div>
        ) : !record ? (
          <div className="flex-1 p-10 text-center text-slate-400">ไม่พบข้อมูลบันทึกคาร์บอนที่ต้องการ</div>
        ) : (
          <>
            {/* Quick Metrics Bar */}
            <div className="bg-slate-950 text-white px-6 py-3.5 flex flex-wrap items-center justify-between border-t border-slate-800 font-mono text-xs shrink-0 shadow-inner">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span className="text-amber-400">S1: <strong>{fmt(record.scope1Co2e)}</strong> kgCO₂e</span>
                <span className="text-blue-400">S2: <strong>{fmt(record.scope2Co2e)}</strong> kgCO₂e</span>
                <span className="text-teal-400">S3: <strong>{fmt(record.scope3Co2e)}</strong> kgCO₂e</span>
              </div>
              <div className="flex items-center gap-3 mt-1 sm:mt-0">
                <span className="text-rose-400">ลด: <strong>-{fmt(record.totalReducedCo2e)}</strong> kgCO₂e</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1"><Calculator size={13} />สุทธิ {fmt(record.netCo2e)} kgCO₂e</span>
              </div>
            </div>

            {/* Layout Body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="md:w-48 bg-slate-50 border-r border-slate-200 p-3 space-y-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0">
                {TABS.map((tab, i) => (
                  <button key={i} onClick={() => setActiveTab(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap md:whitespace-normal ${activeTab === i ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 min-w-0 bg-slate-50/30">
                {/* Tab 0: ข้อมูลทั่วไป */}
                {activeTab === 0 && (
                  <div className="space-y-4 max-w-xl">
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-3.5">
                      <div className="flex items-start gap-3">
                        <Building2 className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-slate-400 font-semibold uppercase">หน่วยงาน / องค์กร</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{record.department?.name || '-'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{record.department?.organization?.name || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                        <Calendar className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-slate-400 font-semibold uppercase">ช่วงเวลากลุ่มข้อมูล</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {MONTH_NAMES_TH[record.month]} {record.year}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                        <FileText className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <div className="w-full">
                          <div className="text-xs text-slate-400 font-semibold uppercase">หมายเหตุ</div>
                          <div className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mt-1.5 whitespace-pre-wrap min-h-[60px] leading-relaxed">
                            {record.notes || 'ไม่มีหมายเหตุระบุ'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1: ขอบเขตที่ 1 */}
                {activeTab === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🏭 เผาไหม้อยู่กับที่ / เคลื่อนที่</h4>
                      {renderDataRow('น้ำมันดีเซล (เครื่องจักร)', record.s1StationaryDieselLiters, 'ลิตร')}
                      {renderDataRow('น้ำมันเบนซิน (เครื่องจักร)', record.s1StationaryGasolineLiters, 'ลิตร')}
                      {renderDataRow('ก๊าซหุงต้ม (LPG)', record.s1CookingLpgKg, 'กิโลกรัม')}
                      {renderDataRow('น้ำมันดีเซล (ยานพาหนะ)', record.s1VehicleDieselLiters, 'ลิตร')}
                      {renderDataRow('น้ำมันเบนซิน (ยานพาหนะ)', record.s1VehicleGasolineLiters, 'ลิตร')}
                      {renderDataRow('ก๊าซธรรมชาติ (CNG)', record.s1VehicleCngKg, 'กิโลกรัม')}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">😷 สารเคมี / ก๊าซทางการแพทย์</h4>
                      {renderDataRow('ก๊าซไนตรัสออกไซด์ (N₂O)', record.s1AnesthesiaN2oMl, 'มิลลิลิตร')}
                      {renderDataRow('ก๊าซไอโซฟลูเรน (Isoflurane)', record.s1AnesthesiaIsoflurMl, 'มิลลิลิตร')}
                      {renderDataRow('ก๊าซเดสฟลูเรน (Desflurane)', record.s1AnesthesiaDesfluMl, 'มิลลิลิตร')}
                      {renderDataRow('ก๊าซเซโวฟลูเรน (Sevoflurane)', record.s1AnesthesiaSevoflurMl, 'มิลลิลิตร')}
                      {renderDataRow('ถังดับเพลิง (CO₂)', record.s1FireExtCo2Kg, 'กิโลกรัม')}
                      {renderDataRow('สารทำความเย็น HFC-134a', record.s1RefrigHfc134aKg, 'กิโลกรัม')}
                      {renderDataRow('สารทำความเย็น R-22', record.s1RefrigR22Kg, 'กิโลกรัม')}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2 col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🚯 ขยะในหน่วยงาน / น้ำเสีย</h4>
                      {renderDataRow('ขยะติดเชื้อบำบัดด้วย Autoclave (ภายใน)', record.s1InfWasteAutoclaveKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะอินทรีย์หมักก๊าซชีวภาพ', record.s1OrganicWasteFermentKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะอินทรีย์ทำปุ๋ยหมัก (ภายใน)', record.s1OrganicWasteCompostKg, 'กิโลกรัม')}
                      {renderDataRow('ปริมาณน้ำเสียเข้าสู่ระบบบำบัด', record.s1WastewaterWaterM3, 'ลูกบาศก์เมตร')}
                      {renderDataRow('COD (ระบบบำบัดน้ำเสีย - Anaerobic Shallow)', record.s1WastewaterCodAnaerobicShallow, 'mg/L')}
                      {renderDataRow('COD (ระบบบำบัดน้ำเสีย - Anaerobic Deep)', record.s1WastewaterCodAnaerobicDeep, 'mg/L')}
                      {renderDataRow('COD (ระบบบำบัดน้ำเสีย - Aerobic)', record.s1WastewaterCodAerobic, 'mg/L')}
                    </div>
                  </div>
                )}

                {/* Tab 2: ขอบเขตที่ 2 */}
                {activeTab === 2 && (
                  <div className="max-w-xl">
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">⚡ การใช้พลังงานทางอ้อม</h4>
                      {renderDataRow('ปริมาณไฟฟ้าที่ซื้อจากภายนอก', record.s2ElectricityKwh, 'kWh')}
                    </div>
                  </div>
                )}

                {/* Tab 3: ขอบเขตที่ 3 */}
                {activeTab === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">💧 ทรัพยากรและเวชภัณฑ์สิ้นเปลือง</h4>
                      {renderDataRow('ปริมาณน้ำประปา', record.s3WaterCubicM, 'ลูกบาศก์เมตร')}
                      {renderDataRow('ผงซักฟอก', record.s3DetergentPowderKg, 'กิโลกรัม')}
                      {renderDataRow('น้ำยาซักฟอก', record.s3LaundryLiquidMl, 'มิลลิลิตร')}
                      {renderDataRow('ตลับหมึกพิมพ์เลเซอร์', record.s3TonerCartridges, 'ตลับ')}
                      {renderDataRow('กระดาษ A4', record.s3PaperA4Reams, 'รีม')}
                      {renderDataRow('ถุงพลาสติกใส่น้ำมัน/ขยะ', record.s3PlasticBagKg, 'กิโลกรัม')}
                      {renderDataRow('หน้ากากอนามัย', record.s3MasksBoxes, 'กล่อง')}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🚗 การขนส่งภายนอก / การเดินทาง</h4>
                      {renderDataRow('น้ำมันดีเซล (จ้างเหมาขนส่ง)', record.s3OutsourceDieselLiters, 'ลิตร')}
                      {renderDataRow('น้ำมันเบนซิน (จ้างเหมาขนส่ง)', record.s3OutsourceGasolineLiters, 'ลิตร')}
                      {renderDataRow('การเดินทางรถยนต์', record.s3TravelCarKm, 'กิโลเมตร')}
                      {renderDataRow('การเดินทางเครื่องบิน', record.s3TravelPlaneKm, 'กิโลเมตร')}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2 col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🗑️ การกำจัดขยะภายนอก</h4>
                      {renderDataRow('ขยะทั่วไป (ส่งกำจัดภายนอก)', record.s3GeneralWasteKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะอันตรายส่งฝังกลบ', record.s3HazardousWasteLandfillKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะอันตรายส่งเผาทำลาย', record.s3HazardousWasteIncinKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะติดเชื้อส่งเผาทำลาย', record.s3InfWasteIncinKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะติดเชื้อส่งบำบัดด้วย Autoclave (ภายนอก)', record.s3InfWasteAutoclaveExtKg, 'กิโลกรัม')}
                    </div>
                  </div>
                )}

                {/* Tab 4: ลดก๊าซเรือนกระจก */}
                {activeTab === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">🌱 กิจกรรมรีไซเคิล / ทำปุ๋ยหมัก</h4>
                      {renderDataRow('รีไซเคิลกระดาษ', record.redRecycledPaperKg, 'กิโลกรัม')}
                      {renderDataRow('รีไซเคิลอะลูมิเนียม', record.redRecycledAluminumKg, 'กิโลกรัม')}
                      {renderDataRow('รีไซเคิลพลาสติก', record.redRecycledPlasticKg, 'กิโลกรัม')}
                      {renderDataRow('รีไซเคิลเหล็ก', record.redRecycledIronKg, 'กิโลกรัม')}
                      {renderDataRow('รีไซเคิลโลหะอื่นๆ', record.redRecycledMetalKg, 'กิโลกรัม')}
                      {renderDataRow('รีไซเคิลขวดแก้ว', record.redRecycledGlassKg, 'กิโลกรัม')}
                      {renderDataRow('ขยะเศษอาหารทำปุ๋ยหมัก', record.redCompostFoodWasteKg, 'กิโลกรัม')}
                      {renderDataRow('เศษกิ่งไม้ใบไม้ทำปุ๋ยหมัก', record.redCompostLeafBranchKg, 'กิโลกรัม')}
                      {renderDataRow('ไฟฟ้าปุ๋ยหมักที่ประหยัดได้', record.redCompostElecKwh, 'kWh')}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5">☀️ โซลาร์เซลล์ / ปลูกต้นไม้</h4>
                      {renderDataRow('วัดด้วยมิเตอร์', record.redSolarHasMeter ? 'ใช่' : 'ไม่ใช่', '')}
                      {renderDataRow('ไฟฟ้าที่ใช้ในระบบผลิต (สูญเสีย)', record.redSolarUsedKwh, 'kWh')}
                      {record.redSolarHasMeter ? (
                        <>
                          {renderDataRow('ไฟฟ้าที่ผลิตได้จริง (จากมิเตอร์)', record.redSolarMeteredKwh, 'kWh')}
                        </>
                      ) : (
                        <>
                          {renderDataRow('กำลังการผลิตแผงเซลล์', record.redSolarPanelWatts, 'วัตต์ต่อแผง')}
                          {renderDataRow('จำนวนแผงเซลล์แสงอาทิตย์', record.redSolarPanelCount, 'แผง')}
                          {renderDataRow('จำนวนวันที่ผลิตไฟฟ้าในเดือนนี้', record.redSolarDays, 'วัน')}
                        </>
                      )}
                      {renderDataRow('จำนวนต้นไม้ที่ปลูก', record.redTreeCount, 'ต้น')}
                      {renderDataRow('Telemedicine CO₂e ที่ลดได้', record.redTelemedicineCo2e, 'kgCO₂e')}
                      {renderDataRow('กิจกรรมลดก๊าซอื่นๆ', record.redOtherCo2e, 'kgCO₂e')}
                      <div className="text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-600 block">รายละเอียดกิจกรรมอื่นๆ:</span>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 mt-1">{record.redOtherDesc || 'ไม่มีรายละเอียดระบุ'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end shrink-0 border-t border-slate-200">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors">
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
