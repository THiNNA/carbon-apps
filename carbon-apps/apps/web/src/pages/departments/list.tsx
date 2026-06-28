import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import type { DepartmentDto, OrganizationDto } from '@enterprise/shared-types';
import { Plus, Pencil, Trash2, Layers, Search } from 'lucide-react';
import { formatDate } from '../../services/date.js';
import { useAuth } from '../../contexts/auth-context.js';

export const DepartmentList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { payload } = useAuth();
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterOrgId, setFilterOrgId] = useState('');

  useEffect(() => {
    if (payload) {
      setFilterOrgId(isSuperAdmin ? '' : (payload.organizationId || ''));
    }
  }, [payload, isSuperAdmin]);

  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DepartmentDto | null>(null);

  const [formData, setFormData] = useState({ code: '', name: '', description: '', organizationId: '' });

  useEffect(() => {
    if (payload && !isSuperAdmin) {
      setFormData(prev => ({ ...prev, organizationId: payload.organizationId || '' }));
    }
  }, [payload, isSuperAdmin]);

  const { data, isLoading } = useQuery<{ items: DepartmentDto[]; meta: any }>({
    queryKey: ['departments', page, search, sortBy, sortOrder, filterOrgId],
    queryFn: async () => {
      const response: any = await api.get('/departments', {
        params: { page, limit, search, sortBy, sortOrder, organizationId: filterOrgId || undefined }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  const { data: orgsData } = useQuery<OrganizationDto[]>({
    queryKey: ['organizations-all'],
    queryFn: async () => {
      const response: any = await api.get('/organizations', { params: { limit: 100 } });
      return response.data;
    },
    enabled: isSuperAdmin
  });

  // Fetch admin's own org name for read-only display
  const { data: adminOrgData } = useQuery<OrganizationDto>({
    queryKey: ['orgSingle', payload?.organizationId],
    queryFn: async () => {
      const response: any = await api.get(`/organizations/${payload?.organizationId}`);
      return response.data;
    },
    enabled: !isSuperAdmin && !!payload?.organizationId
  });

  const adminOrgName = adminOrgData?.name || '';

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/departments', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); showToast('สร้างหน่วยงานสำเร็จ', 'success'); closeForm(); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => api.put(`/departments/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); showToast('อัปเดตหน่วยงานสำเร็จ', 'success'); closeForm(); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); showToast('ลบหน่วยงานสำเร็จ', 'success'); setConfirmDelete(null); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const openCreate = () => {
    setEditingDept(null);
    const defaultOrgId = isSuperAdmin ? (filterOrgId || '') : (payload?.organizationId || '');
    setFormData({ code: '', name: '', description: '', organizationId: defaultOrgId });
    setShowForm(true);
  };
  const openEdit = (dept: DepartmentDto) => { setEditingDept(dept); setFormData({ code: dept.code, name: dept.name, description: dept.description || '', organizationId: dept.organizationId }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingDept(null); };

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      setIsConfirmEditOpen(true);
    } else {
      setIsConfirmCreateOpen(true);
    }
  };

  const handleCreateConfirm = () => {
    createMutation.mutate(formData);
  };

  const handleEditConfirm = () => {
    if (editingDept) {
      updateMutation.mutate({ id: editingDept.id, body: formData });
    }
  };

  const columns: Column<DepartmentDto>[] = [
    { key: 'code', header: 'รหัส', sortable: true },
    { key: 'name', header: 'ชื่อหน่วยงาน', sortable: true },
    {
      key: 'organization' as any,
      header: 'องค์กร',
      render: (row) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          {row.organization?.name || '-'}
        </span>
      )
    },
    {
      key: '_count' as any,
      header: 'ผู้ใช้',
      render: (row) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
          {(row as any)._count?.users ?? 0} คน
        </span>
      )
    },
    { key: 'createdAt', header: 'วันที่สร้าง', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions' as any,
      header: 'จัดการ',
      align: 'center',
      render: (row) => (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors" title="แก้ไข"><Pencil size={14} /></button>
          <button onClick={() => setConfirmDelete(row)} className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors" title="ลบ"><Trash2 size={14} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการหน่วยงาน</h2>
          <p className="text-sm text-slate-400 mt-1">จัดการหน่วยงานภายในองค์กร</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition-all text-sm">
          <Plus size={16} /> เพิ่มหน่วยงาน
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405" />
            <input type="text" placeholder="ค้นหาหน่วยงาน..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {isSuperAdmin && (
            <select value={filterOrgId} onChange={(e) => { setFilterOrgId(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">ทุกองค์กร</option>
              {(orgsData || []).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key, order) => { setSortBy(key); setSortOrder(order); setPage(1); }}
          currentPage={page}
          totalPages={data?.meta?.totalPages || 1}
          totalItems={data?.meta?.total || 0}
          onPageChange={setPage}
          emptyMessage="ไม่พบข้อมูลหน่วยงาน"
        />
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center gap-3 p-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{editingDept ? 'แก้ไขหน่วยงาน' : 'เพิ่มหน่วยงานใหม่'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">สังกัดองค์กร *</label>
                {isSuperAdmin ? (
                  <select value={formData.organizationId} onChange={(e) => setFormData(p => ({ ...p, organizationId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                    <option value="">-- เลือกองค์กร --</option>
                    {(orgsData || []).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={adminOrgName}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">รหัสหน่วยงาน *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อหน่วยงาน *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">คำอธิบาย</label>
                <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">ยกเลิก</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors">
                  {editingDept ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างหน่วยงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="ยืนยันการลบหน่วยงาน"
        message={`คุณต้องการลบหน่วยงาน "${confirmDelete?.name}" ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        confirmLabel="ยืนยันการลบ"
        type="danger"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={isConfirmCreateOpen}
        title="ยืนยันการสร้างหน่วยงาน"
        message={`คุณต้องการสร้างหน่วยงานใหม่ "${formData.name}" ใช่หรือไม่?`}
        confirmLabel="ยืนยันสร้าง"
        type="info"
        onConfirm={handleCreateConfirm}
        onClose={() => setIsConfirmCreateOpen(false)}
      />

      <ConfirmDialog
        isOpen={isConfirmEditOpen}
        title="ยืนยันการแก้ไขข้อมูล"
        message={`คุณต้องการบันทึกการแก้ไขข้อมูลของ "${formData.name}" ใช่หรือไม่?`}
        confirmLabel="ยืนยันบันทึก"
        type="info"
        onConfirm={handleEditConfirm}
        onClose={() => setIsConfirmEditOpen(false)}
      />
    </div>
  );
};
export default DepartmentList;
