import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import type { OrganizationDto } from '@enterprise/shared-types';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';

export const OrganizationList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrganizationDto | null>(null);

  const [formData, setFormData] = useState({ code: '', name: '', description: '', address: '', phone: '' });

  const { data, isLoading } = useQuery<{ items: OrganizationDto[]; meta: any }>({
    queryKey: ['organizations', page, search, sortBy, sortOrder],
    queryFn: async () => {
      const response: any = await api.get('/organizations', {
        params: { page, limit, search, sortBy, sortOrder }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/organizations', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organizations'] }); showToast('สร้างองค์กรสำเร็จ', 'success'); closeForm(); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => api.put(`/organizations/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organizations'] }); showToast('อัปเดตองค์กรสำเร็จ', 'success'); closeForm(); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['organizations'] }); showToast('ลบองค์กรสำเร็จ', 'success'); setConfirmDelete(null); },
    onError: (e: any) => showToast(e.message || 'เกิดข้อผิดพลาด', 'error')
  });

  const openCreate = () => { setEditingOrg(null); setFormData({ code: '', name: '', description: '', address: '', phone: '' }); setShowForm(true); };
  const openEdit = (org: OrganizationDto) => { setEditingOrg(org); setFormData({ code: org.code, name: org.name, description: org.description || '', address: org.address || '', phone: org.phone || '' }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingOrg(null); };

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      setIsConfirmEditOpen(true);
    } else {
      setIsConfirmCreateOpen(true);
    }
  };

  const handleCreateConfirm = () => {
    createMutation.mutate(formData);
  };

  const handleEditConfirm = () => {
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, body: formData });
    }
  };

  const columns: Column<OrganizationDto>[] = [
    { key: 'code', header: 'รหัส', sortable: true },
    { key: 'name', header: 'ชื่อองค์กร', sortable: true },
    { key: 'phone', header: 'เบอร์โทร', render: (row) => row.phone || '-' },
    {
      key: '_count' as any,
      header: 'หน่วยงาน',
      render: (row) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
          {(row as any)._count?.departments ?? 0} หน่วย
        </span>
      )
    },
    {
      key: 'createdAt', header: 'วันที่สร้าง',
      sortable: true,
      align: 'center', render: (row: any) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(row.createdAt).toLocaleDateString('th-TH', {
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
          <h2 className="text-2xl font-bold text-slate-800">จัดการองค์กร</h2>
          <p className="text-sm text-slate-400 mt-1">เพิ่ม แก้ไข หรือลบข้อมูลองค์กรในระบบ</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition-all text-sm">
          <Plus size={16} /> เพิ่มองค์กร
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="ค้นหาองค์กร..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
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
          emptyMessage="ไม่พบข้อมูลองค์กร"
        />
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center gap-3 p-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{editingOrg ? 'แก้ไของค์กร' : 'เพิ่มองค์กรใหม่'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">รหัสองค์กร *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">เบอร์โทรศัพท์</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อองค์กร *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ที่อยู่</label>
                <textarea value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
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
                  {editingOrg ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างองค์กร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="ยืนยันการลบองค์กร"
        message={`คุณต้องการลบองค์กร "${confirmDelete?.name}" ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        confirmLabel="ยืนยันการลบ"
        type="danger"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={isConfirmCreateOpen}
        title="ยืนยันการสร้างองค์กร"
        message={`คุณต้องการสร้างองค์กรใหม่ "${formData.name}" ใช่หรือไม่?`}
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
export default OrganizationList;
