import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import type { CarbonRecordDto, DepartmentDto, OrganizationDto } from '@enterprise/shared-types';
import { Plus, Pencil, Eye, Trash2, Leaf, FileSpreadsheet } from 'lucide-react';
import { CarbonRecordViewModal } from './view-modal.js';
import { CarbonReportModal } from './report-modal.js';
import { useAuth } from '../../contexts/auth-context.js';
import { Select2 } from '../../components/select2.js';


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

const fmt = (v: number | undefined | null) => (v ?? 0).toFixed(2);


export const CarbonRecordList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { payload } = useAuth();
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;
  const isAdmin = payload?.roles.includes('Admin') || false;

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterYear, setFilterYear] = useState<number | ''>(CURRENT_CE_YEAR); // stored as ค.ศ.
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const filterStatus = '';

  useEffect(() => {
    if (payload) {
      setFilterOrgId(isSuperAdmin ? '' : (payload.organizationId || ''));
      setFilterDeptId(isSuperAdmin || isAdmin ? '' : (payload.departmentId || ''));
    }
  }, [payload, isSuperAdmin, isAdmin]);

  const [confirmDelete, setConfirmDelete] = useState<CarbonRecordDto | null>(null);
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

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
          page, limit,
          year: filterYear || undefined, // ส่ง ค.ศ. ไปยัง API ตรงๆ
          month: filterMonth || undefined,
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
    queryFn: async () => { const res: any = await api.get('/organizations', { params: { limit: 100 } }); return res.data; },
    enabled: isSuperAdmin,              // P2-A: ยิง API เฉพาะ SuperAdmin เท่านั้น
    staleTime: 5 * 60 * 1000,          // P2-B: cache 5 นาที ไม่ refetch บ่อย
  });

  const { data: filterDepts } = useQuery<DepartmentDto[]>({
    queryKey: ['departments-all', filterOrgId],
    queryFn: async () => { const res: any = await api.get('/departments/all', { params: { organizationId: filterOrgId || undefined } }); return res.data; },
    enabled: isSuperAdmin ? !!filterOrgId : isAdmin, // P2-A: SuperAdmin ต้องเลือก org ก่อน
    staleTime: 5 * 60 * 1000,          // P2-B: cache 5 นาที
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
      align: 'left',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-700">{MONTH_NAMES_TH[row.month]}</span>
          <div className="text-xs text-slate-400">{row.year + 543}</div>
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
      key: 'updatedAt',
      header: 'วันที่แก้ไขล่าสุด',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(row.updatedAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'จัดการ',
      align: 'center',
      render: (row) => {
        const canDelete = payload?.roles.includes('SuperAdmin') || payload?.permissions.includes('carbon-records:delete');
        return (
          <div className="flex items-center gap-2 justify-center">
            <button onClick={() => setViewRecordId(row.id)} className="p-1.5 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 rounded-md transition-colors" title="ดูรายละเอียด"><Eye size={14} /></button>
            <button onClick={() => navigate(`/carbon/edit/${row.id}`)} className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors" title="แก้ไข"><Pencil size={14} /></button>
            {canDelete && (
              <button onClick={() => setConfirmDelete(row)} className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors" title="ลบ"><Trash2 size={14} /></button>
            )}
          </div>
        );
      }
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
        <div className="flex gap-2">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <FileSpreadsheet className="text-emerald-600" size={16} />
            รายงาน Excel
          </button>
          <button onClick={() => navigate('/carbon/create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <Plus size={16} /> บันทึกข้อมูล
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {isSuperAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">องค์กร</label>
              <Select2
                value={filterOrgId}
                onChange={val => { setFilterOrgId(val); setFilterDeptId(''); setPage(1); }}
                options={[
                  { value: '', label: 'ทุกองค์กร' },
                  ...(orgs?.map(o => ({ value: o.id, label: o.name })) ?? [])
                ]}
              />
            </div>
          )}

          {(isSuperAdmin || isAdmin) && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">หน่วยงาน / กลุ่มงาน</label>
              <Select2
                disabled={isSuperAdmin && !filterOrgId}
                value={filterDeptId}
                onChange={val => { setFilterDeptId(val); setPage(1); }}
                options={[
                  { value: '', label: 'ทุกหน่วยงาน' },
                  ...(filterOrgId && filterDepts ? filterDepts.map(d => ({ value: d.id, label: d.name })) : [])
                ]}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">ปีงบประมาณ</label>
            <Select2
              value={filterYear ? String(filterYear) : ''}
              onChange={val => { setFilterYear(val ? Number(val) : ''); setPage(1); }}
              options={[
                { value: '', label: 'ทุกปี' },
                ...CE_YEAR_OPTIONS.map(y => ({ value: String(y), label: `${y + 543}` }))
              ]}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">เดือน</label>
            <Select2
              value={filterMonth ? String(filterMonth) : ''}
              onChange={val => { setFilterMonth(val ? Number(val) : ''); setPage(1); }}
              options={[
                { value: '', label: 'ทุกเดือน' },
                ...MONTH_NAMES_TH.slice(1).map((name, i) => ({ value: String(i + 1), label: name }))
              ]}
            />
          </div>
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
        message={`ต้องการลบข้อมูลคาร์บอนของ "${confirmDelete?.department?.name}" เดือน ${confirmDelete?.month}/${confirmDelete?.year ? confirmDelete.year + 543 : ''} ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        type="danger" onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} onClose={() => setConfirmDelete(null)} />

      <CarbonRecordViewModal isOpen={!!viewRecordId} recordId={viewRecordId} onClose={() => setViewRecordId(null)} />
      
      <CarbonReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
    </div>
  );
};
