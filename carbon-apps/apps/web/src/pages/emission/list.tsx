import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { useAuth } from '../../contexts/auth-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import { EmissionFactorFormModal } from './form-modal.js';
import {
  Plus, Pencil, Eye, Settings2, Trash2, ShieldCheck, Lock
} from 'lucide-react';
import type { OrganizationDto } from '@enterprise/shared-types';
import { Select2 } from '../../components/select2.js';


const SYSTEM_START_YEAR = 2024; // ปีที่เริ่มเก็บข้อมูล ค.ศ. (ตรงกับ พ.ศ. 2567)
const CURRENT_CE_YEAR = new Date().getFullYear();
const FISCAL_YEARS = Array.from(
  { length: Math.max(3, CURRENT_CE_YEAR - SYSTEM_START_YEAR + 1) },
  (_, i) => Math.max(CURRENT_CE_YEAR, 2026) - i
); // รับประกันมีอย่างน้อย 3 ปีเสมอ (2026, 2025, 2024) ป้องกัน array ว่าง

export const EmissionFactorList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { payload } = useAuth();

  const isSuperAdmin = payload?.roles?.includes('SuperAdmin') ?? false;
  const userOrgId = payload?.organizationId ?? '';

  // Filter States
  const [filterYear, setFilterYear] = useState<string>(''); // ค่าว่าง = ทั้งหมด
  const [filterOrgId, setFilterOrgId] = useState<string>(''); // ค่าว่าง = ทั้งหมด

  // Modal Control States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Delete Confirm States
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; organizationId: string; organizationName: string } | null>(null);

  // Set default organization filter for Admin
  React.useEffect(() => {
    if (!isSuperAdmin && userOrgId) {
      setFilterOrgId(userOrgId);
    }
  }, [isSuperAdmin, userOrgId]);

  // Load Organizations list for dropdown filter
  const { data: orgs } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-list-filter'],
    queryFn: async () => {
      const res: any = await api.get('/organizations');
      return res.data ?? [];
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000, // cache 5 นาที
  });

  // Load Groups (Emission Factors grouped by year and org)
  const { data: groups, isLoading } = useQuery<any[]>({
    queryKey: ['emission-factors-groups'],
    queryFn: async () => {
      const res: any = await api.get('/emission-factors/groups');
      return res.data ?? [];
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (target: { year: number; organizationId: string }) =>
      api.delete('/emission-factors', { params: { year: target.year, organizationId: target.organizationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emission-factors-groups'] });
      showToast('ลบชุดสูตรสัมประสิทธิ์ปีที่ระบุสำเร็จ', 'success');
      setConfirmDeleteOpen(false);
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', 'error')
  });

  // Local sorting
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  };

  // Filter and sort client-side
  const processedRows = React.useMemo(() => {
    let all = groups ?? [];

    // ซ่อนแถว system org สำหรับ non-SuperAdmin ทั้งหมด
    if (!isSuperAdmin) {
      all = all.filter(g => !g.isSystem);
    }

    if (filterYear) {
      all = all.filter(g => g.year === Number(filterYear));
    }
    if (filterOrgId) {
      all = all.filter(g => g.organizationId === filterOrgId);
    }

    return [...all].sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [groups, filterYear, filterOrgId, sortBy, sortOrder, isSuperAdmin]);

  const totalItems = processedRows.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedRows = React.useMemo(() => {
    const start = (page - 1) * limit;
    return processedRows.slice(start, start + limit);
  }, [processedRows, page, limit]);

  const handleOpenModal = (mode: 'create' | 'edit' | 'view', yearVal: number | null, orgIdVal: string | null) => {
    setModalMode(mode);
    setSelectedYear(yearVal);
    setSelectedOrgId(orgIdVal);
    setModalOpen(true);
  };

  const handleDeleteClick = (row: any) => {
    setDeleteTarget({
      year: row.year,
      organizationId: row.organizationId,
      organizationName: row.organizationName
    });
    setConfirmDeleteOpen(true);
  };

  const columns: Column[] = [
    {
      key: 'year',
      header: 'ปี (พ.ศ.)',
      align: 'center',
      sortable: true,
      render: (row: any) => (
        <span className="font-bold text-slate-800 font-mono">
          พ.ศ. {row.year + 543}
        </span>
      )
    },
    {
      key: 'organizationName',
      header: 'หน่วยงาน / องค์กร',
      align: 'left',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-800">{row.organizationName}</p>
            {row.isSystem && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold tracking-wide">
                <ShieldCheck size={10} />
                ค่ามาตรฐานระบบ
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{row.organizationCode}</p>
        </div>
      )
    },
    {
      key: 'count',
      header: 'จำนวนสัมประสิทธิ์',
      align: 'center',
      sortable: true,
      render: (row: any) => (
        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold font-mono">
          {row.count} รายการ
        </span>
      )
    },
    {
      key: 'updatedAt',
      header: 'วันที่แก้ไขล่าสุด',
      align: 'center',
      sortable: true,
      render: (row: any) => (
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
      header: 'การจัดการ',
      align: 'center',
      render: (row: any) => {
        const isSystemRow = row.isSystem === true;
        const canModify = isSuperAdmin || !isSystemRow;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => handleOpenModal('view', row.year, row.organizationId)}
              className="p-1.5 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 rounded-md transition-colors"
              title="แสดงรายละเอียด"
            >
              <Eye size={14} />
            </button>

            {canModify ? (
              <button
                onClick={() => handleOpenModal('edit', row.year, row.organizationId)}
                className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors"
                title="แก้ไข"
              >
                <Pencil size={14} />
              </button>
            ) : (
              <button
                disabled
                className="p-1.5 text-slate-400 bg-slate-100/70 rounded-md cursor-not-allowed opacity-50"
                title="เฉพาะ SuperAdmin เท่านั้นที่แก้ไขค่ามาตรฐานระบบได้"
              >
                <Lock size={14} />
              </button>
            )}

            {canModify ? (
              <button
                onClick={() => handleDeleteClick(row)}
                className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors"
                title="ลบ"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <span
                className="p-1.5 text-slate-400 bg-slate-100/70 rounded-md cursor-not-allowed opacity-50 inline-flex items-center justify-center"
                title="เฉพาะ SuperAdmin เท่านั้นที่ลบค่ามาตรฐานระบบได้"
              >
                <Lock size={14} />
              </span>
            )}
          </div>
        );
      }
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
          <p className="text-sm text-slate-500 mt-0.5">ตั้งค่าตัวเลข EF ที่ใช้ในการคำนวณคาร์บอน แยกตามปีงบประมาณและหน่วยงานองค์กร</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleOpenModal('create', null, null)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={14} /> เพิ่มสัมประสิทธิ์รายปี
          </button>
        </div>
      </div>

      {/* System Defaults Info Banner — SuperAdmin only */}
      {isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <ShieldCheck className="text-amber-500 mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-800">ค่ามาตรฐานเริ่มต้นของระบบ (System Defaults)</p>
            <p className="text-xs text-amber-700 mt-0.5">
              แถวที่แสดงป้าย <span className="font-bold">"ค่ามาตรฐานระบบ"</span> คือค่าสัมประสิทธิ์กลางของระบบสำหรับปีงบประมาณ
              {' '}<strong>2567, 2568, 2569</strong>{' '}ที่แก้ไขได้เฉพาะ <strong>SuperAdmin</strong> เท่านั้น
              ค่าเหล่านี้ใช้เป็นตัวอ้างอิงมาตรฐานสำหรับทุกหน่วยงานในระบบ
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">ปี (พ.ศ.)</label>
            <Select2
              value={filterYear}
              onChange={val => { setFilterYear(val); setPage(1); }}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...FISCAL_YEARS.map(y => ({ value: String(y), label: `${y + 543}` }))
              ]}
              className="min-w-[140px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">หน่วยงาน / องค์กร</label>
            <Select2
              disabled={!isSuperAdmin}
              value={filterOrgId}
              onChange={val => { setFilterOrgId(val); setPage(1); }}
              options={[
                ...(isSuperAdmin ? [
                  { value: '', label: 'ทั้งหมด' },
                  { value: '9aa50b44-7854-46ea-b50e-4553b58c0e00', label: 'ค่ามาตรฐานระบบ' }
                ] : []),
                ...(orgs?.map(o => ({ value: o.id, label: o.name })) ?? [])
              ]}
              className="min-w-[280px]"
            />
          </div>


          {/* <div className="ml-auto text-xs text-slate-400 self-center">
            รวม <strong className="text-slate-700">{totalItems}</strong> แถวข้อมูล
          </div> */}
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
        emptyMessage="ไม่พบข้อมูลสัมประสิทธิ์รายปี — กรุณากดปุ่ม 'เพิ่มสัมประสิทธิ์รายปี' ด้านบน"
      />

      {/* Emission Factor Form/View Modal */}
      <EmissionFactorFormModal
        isOpen={modalOpen}
        mode={modalMode}
        year={selectedYear}
        organizationId={selectedOrgId}
        currentUserOrgId={userOrgId}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setModalOpen(false)}
      />

      {/* Delete year/org confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="ยืนยันการลบสัมประสิทธิ์"
        message={`ต้องการลบชุดสูตรสัมประสิทธิ์ทั้งหมดของปีงบประมาณ ${deleteTarget ? deleteTarget.year + 543 : ''} ขององค์กร "${deleteTarget?.organizationName}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ และอาจส่งผลกระทบต่อความถูกต้องของประวัติบันทึกข้อมูลคาร์บอน`}
        confirmLabel="ลบข้อมูลถาวร"
        type="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
export default EmissionFactorList;
