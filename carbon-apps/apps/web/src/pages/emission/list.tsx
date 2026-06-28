import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import type { EmissionFactorDto } from '@enterprise/shared-types';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import { EmissionFactorViewModal } from './view-modal.js';
import {
  Plus, Pencil, Eye, Settings2,
  Sparkles, Copy, Loader2, AlertCircle
} from 'lucide-react';

const CURRENT_FISCAL_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_FISCAL_YEAR - i + 1);

const CATEGORY_LABELS: Record<string, string> = {
  scope1: 'Scope 1',
  scope2: 'Scope 2',
  scope3: 'Scope 3',
  reduction: 'Reduction'
};

const CATEGORY_COLORS: Record<string, string> = {
  scope1: 'bg-rose-100 text-rose-700 border border-rose-200',
  scope2: 'bg-orange-100 text-orange-700 border border-orange-200',
  scope3: 'bg-sky-100 text-sky-700 border border-sky-200',
  reduction: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
};

// ── Clone Modal ─────────────────────────────────────────────────────────────
interface CloneModalProps {
  isOpen: boolean;
  currentYear: number;
  onClose: () => void;
  onClone: (fromYear: number) => void;
  isLoading: boolean;
}

const CloneModal: React.FC<CloneModalProps> = ({ isOpen, currentYear, onClose, onClone, isLoading }) => {
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
            <p className="text-xs text-amber-700">ค่าของปี {currentYear} ที่มีอยู่แล้วจะถูก Upsert ด้วยค่าจากปี {fromYear}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            ยกเลิก
          </button>
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

// ── Main List ───────────────────────────────────────────────────────────────
export const EmissionFactorList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [filterYear, setFilterYear] = useState<number>(CURRENT_FISCAL_YEAR);
  const [filterCategory, setFilterCategory] = useState('');
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showClone, setShowClone] = useState(false);

  const ic = 'px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400';

  // Pagination & Sorting States (Local)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('category');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  };

  const { data: factors, isLoading } = useQuery<EmissionFactorDto[]>({
    queryKey: ['emission-factors-list', filterYear, filterCategory],
    queryFn: async () => {
      const res: any = await api.get('/emission-factors', { params: { year: filterYear } });
      const all: EmissionFactorDto[] = res.data ?? [];
      return filterCategory ? all.filter((f: EmissionFactorDto) => f.category === filterCategory) : all;
    }
  });

  const initMutation = useMutation({
    mutationFn: () => api.post('/emission-factors/initialize', { year: filterYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-list', filterYear] });
      showToast('โหลดค่ามาตรฐานสำเร็จ', 'success');
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const cloneMutation = useMutation({
    mutationFn: (fromYear: number) => api.post('/emission-factors/clone', { fromYear, toYear: filterYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-list', filterYear] });
      showToast('คัดลอกค่าสำเร็จ', 'success');
      setShowClone(false);
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/emission-factors', { params: { year: filterYear } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-list'] });
      showToast('ลบข้อมูลสำเร็จ', 'success');
      setConfirmDeleteOpen(false);
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาด', 'error')
  });

  // Local Sort and Pagination logic
  const sortedAndFilteredRows = React.useMemo(() => {
    const raw = factors ?? [];
    const sorted = [...raw].sort((a, b) => {
      let valA = (a as any)[sortBy] ?? '';
      let valB = (b as any)[sortBy] ?? '';
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [factors, sortBy, sortOrder]);

  const totalItems = sortedAndFilteredRows.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedRows = React.useMemo(() => {
    const start = (page - 1) * limit;
    return sortedAndFilteredRows.slice(start, start + limit);
  }, [sortedAndFilteredRows, page, limit]);

  const columns: Column[] = [
    {
      key: 'category',
      header: 'ประเภท',
      align: 'center',
      sortable: true,
      render: (row: EmissionFactorDto) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[row.category] ?? 'bg-slate-100 text-slate-600'}`}>
          {CATEGORY_LABELS[row.category] ?? row.category}
        </span>
      )
    },
    {
      key: 'name',
      header: 'กิจกรรม / แหล่งปล่อย',
      align: 'left',
      sortable: true,
      render: (row: EmissionFactorDto) => (
        <div>
          <p className="font-medium text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{row.key}</p>
        </div>
      )
    },
    {
      key: 'value',
      header: 'ค่าสัมประสิทธิ์ (EF)',
      align: 'right',
      sortable: true,
      render: (row: EmissionFactorDto) => (
        <span className="font-mono font-bold text-slate-800">
          {row.value.toLocaleString('th-TH', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
        </span>
      )
    },
    {
      key: 'unit',
      header: 'หน่วย',
      align: 'left',
      sortable: true,
      render: (row: EmissionFactorDto) => (
        <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-mono">
          {row.unit}
        </span>
      )
    },
    {
      key: 'source',
      header: 'แหล่งอ้างอิง',
      align: 'center',
      render: (row: EmissionFactorDto) => row.source ? (
        <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
          มีข้อมูล
        </span>
      ) : (
        <span className="text-slate-300 text-xs">-</span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (row: EmissionFactorDto) => (
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => setViewId(row.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors" title="ดูรายละเอียด">
            <Eye size={15} />
          </button>
          <button onClick={() => navigate(`/settings/emission-factors/edit/${row.id}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="แก้ไข">
            <Pencil size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-emerald-500" size={22} />
            ค่าสัมประสิทธิ์การปล่อยก๊าซ (Emission Factors)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">ตั้งค่าตัวเลข EF ที่ใช้ในการคำนวณคาร์บอน แยกตามปีงบประมาณ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50">
            {initMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            โหลดค่ามาตรฐาน
          </button>
          <button onClick={() => setShowClone(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <Copy size={14} /> คัดลอกจากปีก่อน
          </button>
          <button onClick={() => navigate('/settings/emission-factors/create')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <Plus size={14} /> เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">ปีงบประมาณ</label>
            <select value={filterYear}
              onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}
              className={`${ic} font-bold text-slate-800 min-w-[100px]`}>
              {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">ประเภท</label>
            <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className={ic}>
              <option value="">ทั้งหมด</option>
              <option value="scope1">Scope 1</option>
              <option value="scope2">Scope 2</option>
              <option value="scope3">Scope 3</option>
              <option value="reduction">Reduction</option>
            </select>
          </div>
          <div className="ml-auto text-xs text-slate-400 self-center">
            รวม <strong className="text-slate-700">{totalItems}</strong> รายการ
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedRows}
        loading={isLoading}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="ไม่พบข้อมูล — กด 'โหลดค่ามาตรฐาน' เพื่อสร้างค่าเริ่มต้น"
      />

      {/* View Modal */}
      <EmissionFactorViewModal
        isOpen={!!viewId}
        factorId={viewId}
        onClose={() => setViewId(null)}
        onEdit={(id) => navigate(`/settings/emission-factors/edit/${id}`)}
      />

      {/* Clone Modal */}
      <CloneModal
        isOpen={showClone}
        currentYear={filterYear}
        onClose={() => setShowClone(false)}
        onClone={(y) => cloneMutation.mutate(y)}
        isLoading={cloneMutation.isPending}
      />

      {/* Delete year confirm */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="ลบข้อมูลทั้งปี"
        message={`ต้องการลบค่าสัมประสิทธิ์ทั้งหมดของปี ${filterYear} หรือไม่? ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบ"
        type="danger"
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
