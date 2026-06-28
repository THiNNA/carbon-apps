import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import {
  Settings2, Sparkles, Save, Copy, ChevronDown,
  ChevronRight, Loader2, AlertCircle, CheckCircle2, ExternalLink, BookOpen
} from 'lucide-react';

const CURRENT_FISCAL_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_FISCAL_YEAR - i + 1);

// ── Category display config ───────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  label: string;
  sublabel: string;
  headerColor: string;
  badgeColor: string;
}> = {
  scope1: {
    label: 'Scope 1',
    sublabel: 'การเผาไหม้โดยตรง + การรั่วซึม',
    headerColor: 'from-rose-600 to-red-600',
    badgeColor: 'bg-rose-100 text-rose-700 border border-rose-200'
  },
  scope2: {
    label: 'Scope 2',
    sublabel: 'พลังงานทางอ้อม (ไฟฟ้า)',
    headerColor: 'from-orange-500 to-amber-500',
    badgeColor: 'bg-orange-100 text-orange-700 border border-orange-200'
  },
  scope3: {
    label: 'Scope 3',
    sublabel: 'การปล่อยทางอ้อมอื่นๆ',
    headerColor: 'from-sky-600 to-blue-600',
    badgeColor: 'bg-sky-100 text-sky-700 border border-sky-200'
  },
  reduction: {
    label: 'Reduction',
    sublabel: 'กิจกรรมลดการปล่อยก๊าซเรือนกระจก',
    headerColor: 'from-emerald-600 to-teal-600',
    badgeColor: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  }
};

const CATEGORY_ORDER = ['scope1', 'scope2', 'scope3', 'reduction'];

interface EfRow {
  id: string;
  key: string;
  category: string;
  name: string;
  value: number;
  unit: string;
  source: string | null;
  sourceUrl: string | null;
  originalValue: number;
  isDirty: boolean;
}

// ── Clone Modal ────────────────────────────────────────────────────
const CloneModal: React.FC<{
  isOpen: boolean;
  currentYear: number;
  onClose: () => void;
  onClone: (fromYear: number) => void;
  isLoading: boolean;
}> = ({ isOpen, currentYear, onClose, onClone, isLoading }) => {
  const [fromYear, setFromYear] = useState(currentYear - 1);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Copy size={17} /> คัดลอกค่าจากปีก่อน
          </h3>
          <p className="text-slate-300 text-xs mt-1">นำค่าสัมประสิทธิ์จากปีที่เลือกมาใส่ในปี {currentYear}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">คัดลอกจากปี (พ.ศ.)</label>
            <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400">
              {FISCAL_YEARS.filter(y => y !== currentYear).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">ค่าของปี {currentYear} ทั้งหมดจะถูกแทนที่ด้วยค่าจากปี {fromYear}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={() => onClone(fromYear)} disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            คัดลอก
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────
export const EmissionFactorsSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [fiscalYear, setFiscalYear] = useState(CURRENT_FISCAL_YEAR);
  const [rows, setRows] = useState<EfRow[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showClone, setShowClone] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Fetch EF records ─────────────────────────────────────────────
  const { data: factors, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['emission-factors-settings', fiscalYear],
    queryFn: async () => {
      const res: any = await api.get('/emission-factors', { params: { year: fiscalYear } });
      return res.data ?? [];
    }
  });

  // ── Build editable rows ──────────────────────────────────────────
  useEffect(() => {
    if (!factors) return;
    setRows(factors.map(f => ({
      id: f.id,
      key: f.key,
      category: f.category,
      name: f.name,
      value: Number(f.value),
      unit: f.unit,
      source: f.source ?? null,
      sourceUrl: f.sourceUrl ?? null,
      originalValue: Number(f.value),
      isDirty: false
    })));
  }, [factors]);

  const updateValue = useCallback((key: string, rawVal: string) => {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r;
      const parsed = parseFloat(rawVal);
      const newVal = isNaN(parsed) ? r.value : parsed;
      return { ...r, value: newVal, isDirty: newVal !== r.originalValue };
    }));
  }, []);

  // ── Initialize defaults ──────────────────────────────────────────
  const initMutation = useMutation({
    mutationFn: () => api.post('/emission-factors/initialize', { year: fiscalYear }),
    onSuccess: async () => {
      await refetch();
      showToast('โหลดค่ามาตรฐานสำเร็จ', 'success');
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error')
  });

  // ── Clone from year ──────────────────────────────────────────────
  const cloneMutation = useMutation({
    mutationFn: (fromYear: number) =>
      api.post('/emission-factors/clone', { fromYear, toYear: fiscalYear }),
    onSuccess: async () => {
      await refetch();
      showToast('คัดลอกค่าสำเร็จ', 'success');
      setShowClone(false);
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error')
  });

  // ── Save bulk update ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const dirty = rows.filter(r => r.isDirty);
      if (dirty.length === 0) return 0;
      await api.post('/emission-factors/bulk-update', {
        year: fiscalYear,
        factors: dirty.map(r => ({ key: r.key, value: r.value }))
      });
      return dirty.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-settings', fiscalYear] });
      showToast(
        count > 0 ? `บันทึก ${count} รายการสำเร็จ` : 'ไม่มีการเปลี่ยนแปลง',
        'success'
      );
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const dirtyCount = rows.filter(r => r.isDirty).length;

  // Group rows
  const grouped = rows.reduce<Record<string, EfRow[]>>((acc, row) => {
    const cat = row.category || 'อื่นๆ';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  const allCategories = [...CATEGORY_ORDER, ...Object.keys(grouped).filter(k => !CATEGORY_ORDER.includes(k))];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-emerald-500" size={22} />
            ค่าสัมประสิทธิ์การปล่อยก๊าซ (Emission Factors)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ตั้งค่าตัวเลข EF ที่ใช้ในการคำนวณคาร์บอน แยกตามปีงบประมาณ
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || dirtyCount === 0}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          บันทึก{dirtyCount > 0 ? ` (${dirtyCount} รายการ)` : ''}
        </button>
      </div>

      {/* ── Year + Actions bar ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              ปีงบประมาณ (พ.ศ.)
            </label>
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-bold text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            {rows.length === 0 && !isLoading && (
              <button
                onClick={() => initMutation.mutate()}
                disabled={initMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {initMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                โหลดค่ามาตรฐาน
              </button>
            )}
            {rows.length > 0 && (
              <button
                onClick={() => initMutation.mutate()}
                disabled={initMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                title="รีเซ็ตค่ากลับเป็นค่ามาตรฐาน"
              >
                {initMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                ค่ามาตรฐาน
              </button>
            )}
            <button
              onClick={() => setShowClone(true)}
              disabled={rows.length === 0 && !isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Copy size={14} /> คัดลอกจากปีก่อน
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
            <span>รวม <strong className="text-slate-700">{rows.length}</strong> รายการ</span>
            {dirtyCount > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertCircle size={12} /> แก้ไขแล้ว {dirtyCount} รายการ — ยังไม่บันทึก
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> ค่าเป็นปัจจุบัน
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Loading ────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 size={30} className="animate-spin text-emerald-500" />
          <span className="ml-3 text-slate-500 text-sm">กำลังโหลด...</span>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────── */}
      {!isLoading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-14 text-center">
          <Settings2 size={44} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold text-lg">ยังไม่มีข้อมูลสำหรับปี {fiscalYear}</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">
            กดปุ่มด้านล่างเพื่อโหลดค่ามาตรฐาน หรือคัดลอกจากปีก่อนหน้า
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {initMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              โหลดค่ามาตรฐาน (33 รายการ)
            </button>
            <button onClick={() => setShowClone(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors">
              <Copy size={15} /> คัดลอกจากปีก่อน
            </button>
          </div>
        </div>
      )}

      {/* ── Grouped EF Tables ────────────────────────────── */}
      {!isLoading && rows.length > 0 && (
        <div className="space-y-4">
          {allCategories.filter(cat => grouped[cat]?.length > 0).map(cat => {
            const cfg = CATEGORY_CONFIG[cat] ?? {
              label: cat,
              sublabel: '',
              headerColor: 'from-slate-600 to-slate-700',
              badgeColor: 'bg-slate-100 text-slate-600 border border-slate-200'
            };
            const catRows = grouped[cat];
            const isCollapsed = collapsed[cat];
            const dirtyInCat = catRows.filter(r => r.isDirty).length;

            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Section header */}
                <div
                  className={`bg-gradient-to-r ${cfg.headerColor} px-5 py-3.5 flex items-center justify-between cursor-pointer select-none`}
                  onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight size={16} className="text-white/70" /> : <ChevronDown size={16} className="text-white/70" />}
                    <div>
                      <span className="text-white font-bold text-sm">{cfg.label}</span>
                      <span className="text-white/70 text-xs ml-2">{cfg.sublabel}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeColor}`}>
                      {catRows.length} รายการ
                    </span>
                    {dirtyInCat > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
                        แก้ไข {dirtyInCat}
                      </span>
                    )}
                  </div>
                </div>

                {/* Table */}
                {!isCollapsed && (
                  <div>
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <div className="col-span-5">กิจกรรม / แหล่งปล่อย</div>
                      <div className="col-span-3 text-center">ค่าสัมประสิทธิ์ (EF)</div>
                      <div className="col-span-4">หน่วย</div>
                    </div>

                    <div className="divide-y divide-slate-50">
                      {catRows.map(row => (
                        <div
                          key={row.key}
                          className={`grid grid-cols-12 gap-2 px-5 py-3 items-center transition-colors ${row.isDirty ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}
                        >
                          {/* Name + EF Key + Source */}
                          <div className="col-span-5">
                            <p className="text-sm font-medium text-slate-800">{row.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{row.key}</p>
                            {row.source && (
                              <div className="flex items-start gap-1 mt-1.5">
                                <BookOpen size={10} className="text-slate-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-500 leading-tight">
                                  {row.sourceUrl ? (
                                    <a
                                      href={row.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-600 hover:text-sky-800 hover:underline inline-flex items-center gap-0.5"
                                    >
                                      {row.source}
                                      <ExternalLink size={9} className="shrink-0" />
                                    </a>
                                  ) : row.source}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Value input */}
                          <div className="col-span-3">
                            <div className="relative">
                              <input
                                ref={el => { inputRefs.current[row.key] = el; }}
                                type="number"
                                step="any"
                                defaultValue={row.value}
                                onBlur={e => updateValue(row.key, e.target.value)}
                                className={`w-full px-3 py-1.5 text-sm font-mono text-right border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                                  row.isDirty
                                    ? 'border-amber-400 bg-amber-50 focus:ring-amber-300 text-amber-800'
                                    : 'border-slate-200 bg-white focus:ring-emerald-300 text-slate-800'
                                }`}
                              />
                              {row.isDirty && (
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                              )}
                            </div>
                          </div>

                          {/* Unit */}
                          <div className="col-span-4">
                            <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-mono">
                              {row.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky save bar ──────────────────────────────── */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg px-5 py-3 flex items-center gap-4">
            <span className="text-sm text-amber-600 font-semibold flex items-center gap-1.5">
              <AlertCircle size={14} /> แก้ไขแล้ว {dirtyCount} รายการ — ยังไม่บันทึก
            </span>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      )}

      {/* ── Clone Modal ──────────────────────────────────── */}
      <CloneModal
        isOpen={showClone}
        currentYear={fiscalYear}
        onClose={() => setShowClone(false)}
        onClone={(fromYear) => cloneMutation.mutate(fromYear)}
        isLoading={cloneMutation.isPending}
      />
    </div>
  );
};
