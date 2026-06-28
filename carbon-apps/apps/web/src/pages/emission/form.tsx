import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import type { EmissionFactorDto } from '@enterprise/shared-types';
import { ArrowLeft, Save, Loader2, Settings2, BookOpen } from 'lucide-react';

const CURRENT_FISCAL_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_FISCAL_YEAR - i + 1);

const CATEGORIES = [
  { value: 'scope1', label: 'Scope 1 — การเผาไหม้โดยตรง + การรั่วซึม' },
  { value: 'scope2', label: 'Scope 2 — พลังงานทางอ้อม (ไฟฟ้า)' },
  { value: 'scope3', label: 'Scope 3 — การปล่อยทางอ้อมอื่นๆ' },
  { value: 'reduction', label: 'Reduction — กิจกรรมลดการปล่อยก๊าซเรือนกระจก' }
];

const SOURCE_SUGGESTIONS = [
  { label: 'อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจกจากการเผาไหม้เชื้อเพลิง (ประเทศไทย)', url: 'https://www.tgo.or.th/2020/index.php/th/' },
  { label: 'กฟผ. / อบก. — ค่า Grid Emission Factor ไฟฟ้าจากระบบสายส่ง (ประเทศไทย)', url: 'https://www.egat.co.th/index.php?option=com_content&view=article&id=5&Itemid=117' },
  { label: 'IPCC AR5 — Global Warming Potential (GWP100)', url: 'https://www.ipcc.ch/report/ar5/wg1/' },
  { label: 'DEFRA UK — GHG Conversion Factors for Company Reporting', url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023' },
  { label: 'GHG Protocol — Scope 3 Technical Calculation Guidance', url: 'https://ghgprotocol.org/scope-3-technical-calculation-guidance' },
  { label: 'Andersen M.P.S. et al. — Climate footprint of anaesthetic gases (2012)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3411590/' }
];

interface FormValues {
  year: number;
  category: string;
  key: string;
  name: string;
  value: number;
  unit: string;
  source: string;
  sourceUrl: string;
}

const ic = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors';
const icErr = 'w-full px-3 py-2.5 text-sm border border-rose-300 rounded-xl bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400';

export const EmissionFactorForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      year: CURRENT_FISCAL_YEAR,
      category: 'scope1',
      key: '',
      name: '',
      value: 0,
      unit: '',
      source: '',
      sourceUrl: ''
    }
  });

  // Load existing data for edit
  const { data: existing, isLoading: loadingExisting } = useQuery<EmissionFactorDto>({
    queryKey: ['emission-factor-edit', id],
    queryFn: async () => {
      const res: any = await api.get(`/emission-factors/${id}`);
      return res.data;
    },
    enabled: isEdit && !!id
  });

  useEffect(() => {
    if (existing) {
      reset({
        year: existing.year,
        category: existing.category,
        key: existing.key,
        name: existing.name,
        value: existing.value,
        unit: existing.unit,
        source: existing.source ?? '',
        sourceUrl: existing.sourceUrl ?? ''
      });
    }
  }, [existing, reset]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isEdit) {
        return api.put(`/emission-factors/${id}`, {
          name: data.name,
          value: Number(data.value),
          unit: data.unit,
          source: data.source || null,
          sourceUrl: data.sourceUrl || null
        });
      } else {
        return api.post('/emission-factors', {
          year: Number(data.year),
          category: data.category,
          key: data.key,
          name: data.name,
          value: Number(data.value),
          unit: data.unit,
          source: data.source || null,
          sourceUrl: data.sourceUrl || null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-list'] });
      showToast(isEdit ? 'อัปเดตสำเร็จ' : 'เพิ่มรายการสำเร็จ', 'success');
      navigate('/settings/emission-factors');
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const onSubmit = (data: FormValues) => saveMutation.mutate(data);

  const selectedSource = watch('source');
  const applySuggestion = (s: { label: string; url: string }) => {
    setValue('source', s.label);
    setValue('sourceUrl', s.url);
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={30} className="animate-spin text-emerald-500" />
        <span className="ml-3 text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings/emission-factors')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-emerald-500" size={22} />
            {isEdit ? 'แก้ไขค่าสัมประสิทธิ์' : 'เพิ่มค่าสัมประสิทธิ์ใหม่'}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {isEdit ? `แก้ไข: ${existing?.name ?? '...'}` : 'เพิ่มรายการ Emission Factor แบบกำหนดเอง'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Section 1: ข้อมูลพื้นฐาน ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">ข้อมูลพื้นฐาน</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ปีงบประมาณ (พ.ศ.) <span className="text-rose-500">*</span></label>
              <select {...register('year', { required: true })}
                disabled={isEdit}
                className={`${ic} ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}>
                {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ประเภท / Scope <span className="text-rose-500">*</span></label>
              <select {...register('category', { required: true })}
                disabled={isEdit}
                className={`${ic} ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              รหัส Key <span className="text-rose-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(ตัวอักษรและตัวเลข ไม่มีช่องว่าง เช่น s1Diesel)</span>
            </label>
            <input
              {...register('key', { required: 'กรุณาระบุ Key', pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Key ต้องเป็น a-z, A-Z, 0-9, _ เท่านั้น' } })}
              disabled={isEdit}
              placeholder="เช่น s1StationaryDiesel"
              className={`${errors.key ? icErr : ic} ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'font-mono'}`}
            />
            {errors.key && <p className="text-xs text-rose-500 mt-1">{errors.key.message}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ชื่อกิจกรรม / แหล่งปล่อย <span className="text-rose-500">*</span></label>
            <input
              {...register('name', { required: 'กรุณาระบุชื่อกิจกรรม' })}
              placeholder="เช่น น้ำมันดีเซลสำหรับเครื่องจักร"
              className={errors.name ? icErr : ic}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
          </div>
        </div>

        {/* ── Section 2: ค่า EF ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">ค่าสัมประสิทธิ์ (Emission Factor Value)</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ค่า EF <span className="text-rose-500">*</span></label>
              <input
                type="number"
                step="any"
                {...register('value', { required: 'กรุณาระบุค่า EF', min: { value: 0, message: 'ค่าต้องไม่ติดลบ' } })}
                placeholder="0.0000"
                className={`${errors.value ? icErr : ic} font-mono text-right`}
              />
              {errors.value && <p className="text-xs text-rose-500 mt-1">{errors.value.message as string}</p>}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">หน่วย <span className="text-rose-500">*</span></label>
              <input
                {...register('unit', { required: 'กรุณาระบุหน่วย' })}
                placeholder="เช่น kgCO2e/ลิตร"
                className={`${errors.unit ? icErr : ic} font-mono`}
              />
              {errors.unit && <p className="text-xs text-rose-500 mt-1">{errors.unit.message}</p>}
            </div>
          </div>
        </div>

        {/* ── Section 3: แหล่งที่มา ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
            <BookOpen size={14} /> แหล่งที่มาของข้อมูล (อ้างอิง)
          </h3>

          {/* Quick fill suggestions */}
          <div>
            <p className="text-xs text-slate-500 mb-2">เลือกแหล่งอ้างอิงที่ใช้บ่อย:</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_SUGGESTIONS.map(s => (
                <button
                  key={s.url}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedSource === s.label
                      ? 'bg-sky-100 text-sky-700 border-sky-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
                  }`}
                >
                  {s.label.split('—')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">ชื่อแหล่งอ้างอิง</label>
            <input
              {...register('source')}
              placeholder="เช่น อบก. — ค่าสัมประสิทธิ์การปล่อยก๊าซเรือนกระจก..."
              className={ic}
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL อ้างอิง</label>
            <input
              {...register('sourceUrl')}
              type="url"
              placeholder="https://www.tgo.or.th/..."
              className={`${ic} font-mono`}
            />
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex gap-3 justify-end pb-6">
          <button type="button" onClick={() => navigate('/settings/emission-factors')}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          <button type="submit" disabled={isSubmitting || saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50">
            {(isSubmitting || saveMutation.isPending)
              ? <Loader2 size={15} className="animate-spin" />
              : <Save size={15} />}
            {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
        </div>
      </form>
    </div>
  );
};
