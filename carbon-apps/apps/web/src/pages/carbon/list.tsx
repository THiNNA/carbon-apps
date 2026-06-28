import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import type { CarbonRecordDto, DepartmentDto, OrganizationDto } from '@enterprise/shared-types';
import { Plus, Pencil, Eye, Trash2, Leaf } from 'lucide-react';
import { CarbonRecordViewModal } from './view-modal.js';

const MONTH_NAMES_TH = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const CURRENT_YEAR = new Date().getFullYear();

const fmt = (v: number | undefined | null) => (v ?? 0).toFixed(2);

// Style helper for filters
const ic = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400';

export const CarbonRecordList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterYear, setFilterYear] = useState<number | ''>(CURRENT_YEAR);
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const filterStatus = '';

  const [confirmDelete, setConfirmDelete] = useState<CarbonRecordDto | null>(null);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  };

  const { data, isLoading } = useQuery<{ items: CarbonRecordDto[]; meta: any }>({
    queryKey: ['carbon-records', page, filterYear, filterMonth, filterOrgId, filterDeptId, filterStatus, sortBy, sortOrder],
    queryFn: async () => {
      const res: any = await api.get('/carbon-records', {
        params: {
          page, limit, year: filterYear || undefined, month: filterMonth || undefined,
          organizationId: filterOrgId || undefined, departmentId: filterDeptId || undefined,
          status: filterStatus || undefined,
          sortBy, sortOrder
        }
      });
      return { items: res.data, meta: res.meta };
    }
  });

  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-all'],
    queryFn: async () => { const res: any = await api.get('/organizations', { params: { limit: 100 } }); return res.data; }
  });

  const { data: filterDepts } = useQuery<DepartmentDto[]>({
    queryKey: ['departments-all', filterOrgId],
    queryFn: async () => { const res: any = await api.get('/departments/all', { params: { organizationId: filterOrgId || undefined } }); return res.data; }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/carbon-records/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['carbon-records'] }); showToast('ลบข้อมูลสำเร็จ', 'success'); setConfirmDelete(null); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });


  const records = data?.items || [];
  const meta = data?.meta;

  const columns: Column<CarbonRecordDto>[] = [
    {
      key: 'department',
      header: 'หน่วยงาน',
      align: 'left',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.department?.name || '-'}</div>
          <div className="text-xs text-slate-400">{row.department?.organization?.name || '-'}</div>
        </div>
      )
    },
    {
      key: 'year',
      header: 'ปี / เดือน',
      sortable: true,
      align: 'center',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-700">{MONTH_NAMES_TH[row.month]}</span>
          <div className="text-xs text-slate-400">{row.year}</div>
        </div>
      )
    },
    {
      key: 'scope1Co2e',
      header: 'ขอบเขตที่ 1',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-amber-700">{fmt(row.scope1Co2e)}</span>
    },
    {
      key: 'scope2Co2e',
      header: 'ขอบเขตที่ 2',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-blue-700">{fmt(row.scope2Co2e)}</span>
    },
    {
      key: 'scope3Co2e',
      header: 'ขอบเขตที่ 3',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-teal-700">{fmt(row.scope3Co2e)}</span>
    },
    {
      key: 'totalCo2e',
      header: 'รวม (kgCO₂e)',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono font-bold text-emerald-700">{fmt(row.totalCo2e)}</span>
    },
    {
      key: 'totalReducedCo2e',
      header: 'ลดได้ (kgCO₂e)',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono text-rose-600">-{fmt(row.totalReducedCo2e)}</span>
    },
    {
      key: 'netCo2e',
      header: 'สุทธิ (kgCO₂e)',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono font-bold text-slate-800">{fmt(row.netCo2e)}</span>
    },
    {
      key: 'actions',
      header: 'จัดการ',
      align: 'center',
      render: (row) => (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setViewRecordId(row.id)} className="p-1.5 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 rounded-md transition-colors" title="ดูรายละเอียด"><Eye size={14} /></button>
          <button onClick={() => navigate(`/carbon/edit/${row.id}`)} className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors" title="แก้ไข"><Pencil size={14} /></button>
          <button onClick={() => setConfirmDelete(row)} className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors" title="ลบ"><Trash2 size={14} /></button>
        </div>
      )
    }
  ];



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Leaf className="text-emerald-500" size={22} />
            เก็บรวบรวมข้อมูลคาร์บอน
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">บันทึกข้อมูลการปล่อยก๊าซเรือนกระจกของแต่ละหน่วยงานรายเดือน (ขอบเขตที่ 1-3)</p>
        </div>
        <button onClick={() => navigate('/carbon/create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <Plus size={16} /> บันทึกข้อมูล
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
          <select value={filterOrgId} onChange={e => { setFilterOrgId(e.target.value); setFilterDeptId(''); setPage(1); }} className={ic}>
            <option value="">ทุกองค์กร</option>
            {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={filterDeptId} onChange={e => { setFilterDeptId(e.target.value); setPage(1); }} className={ic}>
            <option value="">ทุกหน่วยงาน</option>
            {filterDepts?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterYear} onChange={e => { setFilterYear(e.target.value ? Number(e.target.value) : ''); setPage(1); }} className={ic}>
            <option value="">ทุกปี</option>
            {Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value ? Number(e.target.value) : ''); setPage(1); }} className={ic}>
            <option value="">ทุกเดือน</option>
            {MONTH_NAMES_TH.slice(1).map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
          </select>
          {/* <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={ic}>
            <option value="">ทุกสถานะ</option>
            <option value="draft">แบบร่าง</option>
            <option value="submitted">ส่งแล้ว</option>
            <option value="approved">อนุมัติแล้ว</option>
          </select> */}
          {/* <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showDeleted} onChange={e => { setShowDeleted(e.target.checked); setPage(1); }} className="rounded border-slate-300 text-emerald-600" />
            แสดงที่ถูกลบ
          </label> */}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={records}
        loading={isLoading}
        currentPage={page}
        totalPages={meta?.totalPages || 1}
        totalItems={meta?.total || 0}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="ยังไม่มีข้อมูลคาร์บอน"
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog isOpen={!!confirmDelete} title="ยืนยันการลบข้อมูล"
        message={`ต้องการลบข้อมูลคาร์บอนของ "${confirmDelete?.department?.name}" เดือน ${confirmDelete?.month}/${confirmDelete?.year} ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        type="danger" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onClose={() => setConfirmDelete(null)} />

      <CarbonRecordViewModal isOpen={!!viewRecordId} recordId={viewRecordId} onClose={() => setViewRecordId(null)} />
    </div>
  );
};
