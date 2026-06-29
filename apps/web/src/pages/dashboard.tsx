import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api.js';
import { useAuth } from '../contexts/auth-context.js';
import { LoadingSpinner } from '../components/loading-spinner.js';
import { Leaf, TrendingUp, TrendingDown, Calendar, Building, Landmark, AlertTriangle } from 'lucide-react';
import type { CarbonDashboardStatsDto, OrganizationDto, DepartmentDto } from '@enterprise/shared-types';

const SYSTEM_START_YEAR = 2024; // ปีที่เริ่มเก็บข้อมูล ค.ศ. (ตรงกับ พ.ศ. 2567)
const CURRENT_CE_YEAR = new Date().getFullYear();
const CE_YEAR_OPTIONS = Array.from(
  { length: Math.max(3, CURRENT_CE_YEAR - SYSTEM_START_YEAR + 1) },
  (_, i) => Math.max(CURRENT_CE_YEAR, 2026) - i
); // รับประกันมีอย่างน้อย 3 ปีเสมอ (2026, 2025, 2024) ป้องกัน array ว่าง
const fmt = (v: number | undefined | null) => (v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ic = 'px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400';

export const Dashboard: React.FC = () => {
  const { payload } = useAuth();
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;
  const isAdmin = payload?.roles.includes('Admin') || false;

  // Filters State (stored as พ.ศ., converted to ค.ศ. when calling API)
  const [year, setYear] = useState<number>(0); // 0 = ยังไม่ได้โหลด available years
  const [orgId, setOrgId] = useState<string>('');
  const [deptId, setDeptId] = useState<string>('');

  useEffect(() => {
    if (payload) {
      setOrgId(isSuperAdmin ? '' : (payload.organizationId || ''));
      setDeptId(isSuperAdmin || isAdmin ? '' : (payload.departmentId || ''));
    }
  }, [payload, isSuperAdmin, isAdmin]);

  // Queries
  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-all'],
    queryFn: async () => {
      const res: any = await api.get('/organizations', { params: { limit: 100 } });
      return res.data;
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000, // cache 5 นาที
  });

  const { data: filterDepts } = useQuery<DepartmentDto[]>({
    queryKey: ['departments-all', orgId],
    queryFn: async () => {
      const res: any = await api.get('/departments/all', { params: { organizationId: orgId || undefined } });
      return res.data;
    },
    enabled: isSuperAdmin || (isAdmin && !!orgId),
    staleTime: 5 * 60 * 1000, // cache 5 นาที
  });

  // ปีที่มีข้อมูลจริงในระบบ (BE)
  const { data: availableYears } = useQuery<number[]>({
    queryKey: ['available-years', orgId, deptId],
    queryFn: async () => {
      const res: any = await api.get('/dashboard/available-years', {
        params: { organizationId: orgId || undefined, departmentId: deptId || undefined }
      });
      // API คืนเป็น ค.ศ. → ใช้เป็น ค.ศ. ตรงๆ ใน State
      return res.data as number[];
    },
    staleTime: 5 * 60 * 1000, // cache 5 นาที
  });

  // ตั้ง year เริ่มต้นเมื่อ availableYears โหลดเสร็จ
  useEffect(() => {
    if (availableYears) {
      if (availableYears.length > 0 && year === 0) {
        setYear(availableYears[0]); // ปีล่าสุดที่มีข้อมูล
      } else if (availableYears.length === 0 && year === 0) {
        setYear(CURRENT_CE_YEAR); // ถ้าไม่มีข้อมูลเลย ให้ตั้งเป็นปีปัจจุบัน
      }
    }
  }, [availableYears, year]);

  // ปีฐาน = ปีก่อนหน้าที่ใกล้ที่สุดที่มีข้อมูล ถ้าไม่มีให้เปรียบกับตัวเอง
  const baseYear = availableYears
    ? (availableYears.find(y => y < year) ?? year)
    : year;

  const { data: stats, isLoading, error } = useQuery<CarbonDashboardStatsDto>({
    queryKey: ['carbon-dashboard-stats', year, baseYear, orgId, deptId],
    queryFn: async () => {
      const res: any = await api.get('/dashboard/carbon-stats', {
        params: {
          year,       // ส่ง ค.ศ. ไปยัง API ตรงๆ
          baseYear,   // ส่ง ค.ศ. ไปยัง API ตรงๆ
          organizationId: orgId || undefined,
          departmentId: deptId || undefined
        }
      });
      return res.data;
    },
    enabled: year > 0
  });

  // กำลังรอ API available-years
  if (availableYears === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // availableYears มีข้อมูล แต่ year ยังเป็น 0 (รอ useEffect ตั้งค่า)
  if (year === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-50 text-rose-800 p-4 rounded-lg border border-rose-200">
        <h3 className="font-bold">ข้อผิดพลาด</h3>
        <p>ไม่สามารถดึงข้อมูลสรุปผลคาร์บอนฟุตพริ้นท์ได้</p>
      </div>
    );
  }

  const cy = stats.summary.currentYear;
  const by = stats.summary.baseYear;

  // Calculate comparisons
  const calcDiff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const emissionDiff = calcDiff(cy.emission, by.emission);
  const reductionDiff = calcDiff(cy.reduction, by.reduction);
  const removalDiff = calcDiff(cy.removal, by.removal);
  const netDiff = calcDiff(cy.net, by.net);

  const scopeBreakdown = stats.scopeBreakdown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Leaf className="text-emerald-500" size={26} />
            สรุปผลการปล่อยคาร์บอน (Carbon Footprint Dashboard)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            วิเคราะห์และรายงานสรุปผลการปล่อยและการลดก๊าซเรือนกระจกขององค์กร เปรียบเทียบกับปีฐาน
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Year */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase">ปี:</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={ic}>
              {CE_YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              เทียบกับ {baseYear === year ? `ปี ${year + 543}` : `ปี ${baseYear + 543}`}
            </span>
          </div>

          {/* Organization Filter (SuperAdmin only) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Building size={16} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase">องค์กร:</span>
              <select value={orgId} onChange={e => { setOrgId(e.target.value); setDeptId(''); }} className={ic}>
                <option value="">ทุกองค์กร</option>
                {orgs?.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter (SuperAdmin and Admin) */}
          {(isSuperAdmin || isAdmin) && (
            <div className="flex items-center gap-2">
              <Landmark size={16} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase">หน่วยงาน/กลุ่มงาน:</span>
              <select
                value={deptId}
                onChange={e => setDeptId(e.target.value)}
                className={`${ic} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                disabled={isSuperAdmin && !orgId}
              >
                <option value="">ทุกหน่วยงาน</option>
                {orgId && filterDepts?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Static Info for Roles */}
          {/* {!isSuperAdmin && !isAdmin && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
              <Building size={14} />
              <span>{payload?.email} (ระดับหน่วยงาน)</span>
            </div>
          )} */}
        </div>
      </div>

      {/* Comparison Grid (Base Year vs currentYear) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Emission */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                การปล่อยก๊าซเรือนกระจกสะสม
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{fmt(cy.emission)}</p>
              <p className="text-xs text-slate-400 mt-1">kgCO₂e (ปี {year + 543})</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">ปีฐาน ({baseYear + 543}): {fmt(by.emission)}</span>
              <span className={`flex items-center gap-0.5 font-bold ${emissionDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {emissionDiff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {emissionDiff > 0 ? '+' : ''}{emissionDiff.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Reduction */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                กิจกรรมการลดก๊าซเรือนกระจก
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">-{fmt(cy.reduction)}</p>
              <p className="text-xs text-slate-400 mt-1">kgCO₂e (ปี {year + 543})</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">ปีฐาน ({baseYear + 543}): -{fmt(by.reduction)}</span>
              <span className={`flex items-center gap-0.5 font-bold ${reductionDiff > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {reductionDiff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {reductionDiff > 0 ? '+' : ''}{reductionDiff.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Removal */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                การดูดกลับก๊าซเรือนกระจก (ต้นไม้)
              </p>
              <p className="text-2xl font-bold text-teal-600 mt-2">-{fmt(cy.removal)}</p>
              <p className="text-xs text-slate-400 mt-1">kgCO₂e (ปี {year + 543})</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">ปีฐาน ({baseYear + 543}): -{fmt(by.removal)}</span>
              <span className={`flex items-center gap-0.5 font-bold ${removalDiff >= 0 ? 'text-teal-600' : 'text-slate-400'}`}>
                {removalDiff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {removalDiff >= 0 ? '+' : ''}{removalDiff.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Net */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-xl shadow-md flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              ปริมาณการปล่อยสุทธิ (Net GHGs)
            </p>
            <p className="text-3xl font-extrabold mt-2">
              {cy.net < 0 ? '' : '+'}{fmt(cy.net)}
            </p>
            <p className="text-xs text-emerald-100 mt-1">kgCO₂e (ปี {year + 543})</p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="text-emerald-100">ปีฐาน ({baseYear + 543}): {fmt(by.net)}</span>
            <span className={`flex items-center gap-0.5 font-extrabold ${netDiff <= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {netDiff <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {netDiff > 0 ? '+' : ''}{netDiff.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Details Row: Scope Breakdown & Top 5 activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scope breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">สัดส่วนการปล่อยก๊าซเรือนกระจกรายขอบเขต (Scope Breakdown)</h3>
            <span className="text-xs text-slate-400 font-semibold">หน่วย: kgCO₂e</span>
          </div>

          <div className="space-y-6">
            {/* Scope 1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-700">ขอบเขตที่ 1: การปล่อยก๊าซเรือนกระจกทางตรง (Direct GHGs)</span>
                <span className="font-mono text-slate-600 font-bold">{fmt(cy.scope1)} ({((cy.scope1 / (cy.emission || 1)) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(cy.scope1 / (cy.emission || 1)) * 100}%` }} />
              </div>
              {/* S1 breakdown list */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-xs text-slate-500">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">เผาไหม้อยู่กับที่</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope1.stationary)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">เผาไหม้เคลื่อนที่</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope1.mobile)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">การรั่วไหล</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope1.fugitive)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">ขยะบำบัดภายใน</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope1.waste)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">การบำบัดน้ำเสีย</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope1.wastewater)}</div>
                </div>
              </div>
            </div>

            {/* Scope 2 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-700">ขอบเขตที่ 2: การปล่อยก๊าซเรือนกระจกทางอ้อมจากการใช้พลังงาน (Energy Indirect GHGs)</span>
                <span className="font-mono text-slate-600 font-bold">{fmt(cy.scope2)} ({((cy.scope2 / (cy.emission || 1)) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(cy.scope2 / (cy.emission || 1)) * 100}%` }} />
              </div>
              {/* S2 breakdown list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs text-slate-500">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">กระแสไฟฟ้าในองค์กร</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope2.electricity)}</div>
                </div>
              </div>
            </div>

            {/* Scope 3 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-700">ขอบเขตที่ 3: การปล่อยก๊าซเรือนกระจกทางอ้อมอื่นๆ (Other Indirect GHGs)</span>
                <span className="font-mono text-slate-600 font-bold">{fmt(cy.scope3)} ({((cy.scope3 / (cy.emission || 1)) * 100).toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${(cy.scope3 / (cy.emission || 1)) * 100}%` }} />
              </div>
              {/* S3 breakdown list */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs text-slate-500">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">วัสดุ สาธารณูปโภค</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope3.resources)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">เชื้อเพลิงจ้างเหมา</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope3.outsourcedFuel)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">กำจัดของเสียภายนอก</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope3.externalWaste)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <div className="text-slate-400">การเดินทางทางธุรกิจ</div>
                  <div className="font-semibold font-mono text-slate-700 mt-0.5">{fmt(scopeBreakdown.currentYear.scope3.travel)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOP 5 Emitters */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">5 อันดับกิจกรรมปล่อยคาร์บอนสูงสุด</h3>
              <span className="text-xs text-rose-500 font-semibold flex items-center gap-0.5"><AlertTriangle size={12} /> Emitters</span>
            </div>

            {stats.topActivities.length === 0 ? (
              <div className="text-slate-400 text-sm h-64 flex items-center justify-center">
                ยังไม่มีข้อมูลการปล่อยก๊าซในระบบสำหรับปีที่เลือก
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topActivities.map((act, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                        {index + 1}. {act.name}
                      </span>
                      <span className="font-mono text-slate-500">{fmt(act.value)} kgCO₂e ({act.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${act.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-start gap-2 leading-relaxed">
              <Leaf size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>แนวทางลดโลกร้อน:</strong> มุ่งเน้นการลดปริมาณการปล่อยจากกิจกรรมหลักข้างต้น เช่น การอนุรักษ์ไฟฟ้า หรือเปลี่ยนมาใช้โซลาร์เซลล์ จะเห็นผลลัพธ์การลดได้อย่างชัดเจนที่สุด
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
