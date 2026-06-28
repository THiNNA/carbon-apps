import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import type { RoleDto, PermissionDto } from '@enterprise/shared-types';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import { formatDate, formatDateTime } from '../../services/date.js';

export const RoleList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals & Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [roleToActOn, setRoleToActOn] = useState<RoleDto | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissionIds, setFormPermissionIds] = useState<string[]>([]);

  // Fetch Roles
  const { data, isLoading } = useQuery<{ items: RoleDto[]; meta: any }>({
    queryKey: ['roles', page, search, sortBy, sortOrder],
    queryFn: async () => {
      const response: any = await api.get('/roles', {
        params: { page, limit, search, sortBy, sortOrder }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  // Fetch Permissions list for checkboxes
  const { data: permissionsData } = useQuery<PermissionDto[]>({
    queryKey: ['permissionsListSelect'],
    queryFn: async () => {
      const response: any = await api.get('/permissions', { params: { limit: 100 } });
      return response.data;
    }
  });

  const permissions = permissionsData || [];

  // Create Role Mutation
  const createMutation = useMutation({
    mutationFn: (newRole: any) => api.post('/roles', newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('สร้างบทบาทเรียบร้อยแล้ว!', 'success');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create role', 'error');
    }
  });

  // Update Role Mutation
  const updateMutation = useMutation({
    mutationFn: (updatedRole: any) => api.put(`/roles/${selectedRole?.id}`, updatedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('อัปเดตบทบาทเรียบร้อยแล้ว!', 'success');
      setIsEditOpen(false);
      setSelectedRole(null);
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update role', 'error');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast('ลบบทบาทเรียบร้อยแล้ว!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  });

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPermissionIds([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (role: RoleDto) => {
    setSelectedRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissionIds(role.permissions?.map((p) => p.id) || []);
    setIsEditOpen(true);
  };

  const handleOpenDetail = (role: RoleDto) => {
    setSelectedRole(role);
    setIsDetailOpen(true);
  };

  const handlePermissionCheck = (pId: string, checked: boolean) => {
    if (checked) {
      setFormPermissionIds((prev) => [...prev, pId]);
    } else {
      setFormPermissionIds((prev) => prev.filter((id) => id !== pId));
    }
  };

  const [isConfirmCreateOpen, setIsConfirmCreateOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmCreateOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmEditOpen(true);
  };

  const handleCreateConfirm = () => {
    createMutation.mutate({
      name: formName,
      description: formDescription,
      permissionIds: formPermissionIds
    });
  };

  const handleEditConfirm = () => {
    updateMutation.mutate({
      name: formName,
      description: formDescription,
      permissionIds: formPermissionIds
    });
  };

  const handleDeleteConfirm = () => {
    if (roleToActOn) {
      deleteMutation.mutate(roleToActOn.id);
    }
  };

  const columns: Column<RoleDto>[] = [
    {
      key: 'name',
      header: 'ชื่อบทบาท',
      sortable: true,
      render: (row) => (
        <div className="font-semibold text-slate-800">
          {row.name}
        </div>
      )
    },
    { key: 'description', header: 'คำอธิบาย' },
    {
      key: 'permissions',
      header: 'สิทธิ์การใช้งาน',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-500">
          กำหนดสิทธิ์ไว้ {row.permissions?.length || 0} รายการ
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'วันที่สร้าง',
      sortable: true,
      render: (row) => formatDate(row.createdAt)
    },
    {
      key: 'actions',
      header: 'การจัดการ',
      align: 'center',
      render: (row) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handleOpenDetail(row)}
            className="p-1.5 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 rounded-md transition-colors"
            title="ดูรายละเอียด"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors"
            title="แก้ไขบทบาท"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              setRoleToActOn(row);
              setIsDeleteOpen(true);
            }}
            className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors"
            title="ลบบทบาท"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการบทบาท</h2>
          <p className="text-sm text-slate-400">ดู รายละเอียด สร้าง แก้ไข และลบข้อมูลบทบาทผู้ใช้งาน</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow transition-colors text-sm"
        >
          <Plus size={16} />
          เพิ่มบทบาท
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-slate-800">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-450">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาตามชื่อบทบาท..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        currentPage={page}
        totalPages={data?.meta?.totalPages || 1}
        totalItems={data?.meta?.total || 0}
        onPageChange={(p) => setPage(p)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        emptyMessage="ไม่พบข้อมูลบทบาทตามเงื่อนไขที่กำหนด"
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="ลบบทบาท"
        message={`คุณต้องการลบข้อมูลบทบาท ${roleToActOn?.name} ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        confirmLabel="ยืนยันการลบ"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteOpen(false)}
      />

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-2xl w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">สร้างบทบาทใหม่</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อบทบาท</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">คำอธิบาย</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  กำหนดสิทธิ์การใช้งาน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded bg-slate-50/50">
                  {permissions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissionIds.includes(p.id)}
                        onChange={(e) => handlePermissionCheck(p.id, e.target.checked)}
                        className="rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">{p.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  สร้างบทบาท
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-2xl w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">แก้ไขบทบาท</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อบทบาท</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">คำอธิบาย</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  กำหนดสิทธิ์การใช้งาน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded bg-slate-50/50">
                  {permissions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissionIds.includes(p.id)}
                        onChange={(e) => handlePermissionCheck(p.id, e.target.checked)}
                        className="rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 block text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block -mt-0.5">{p.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-md w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">รายละเอียดบทบาท</h3>
            <div className="space-y-3.5 text-sm text-slate-850">
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">รหัสบทบาท</span>
                <span className="col-span-2 text-slate-800 break-all font-mono text-xs">{selectedRole.id}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">ชื่อบทบาท</span>
                <span className="col-span-2 font-semibold text-slate-900">{selectedRole.name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">คำอธิบาย</span>
                <span className="col-span-2 text-slate-700">{selectedRole.description || '-'}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">วันที่สร้าง</span>
                <span className="col-span-2">{formatDateTime(selectedRole.createdAt)}</span>
              </div>
              <div className="border-t pt-3 mt-4 border-slate-100">
                <span className="block font-bold text-xs text-slate-400 uppercase tracking-wider mb-2.5">
                  สิทธิ์ได้รับการกำหนด
                </span>
                {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-100 rounded">
                    {selectedRole.permissions.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-100"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 block italic">ยังไม่ได้กำหนดสิทธิ์ใดๆ</span>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmCreateOpen}
        title="ยืนยันการสร้างบทบาท"
        message={`คุณต้องการสร้างบทบาทใหม่ "${formName}" ใช่หรือไม่?`}
        confirmLabel="ยืนยันสร้าง"
        type="info"
        onConfirm={handleCreateConfirm}
        onClose={() => setIsConfirmCreateOpen(false)}
      />

      <ConfirmDialog
        isOpen={isConfirmEditOpen}
        title="ยืนยันการแก้ไขข้อมูล"
        message={`คุณต้องการบันทึกการแก้ไขข้อมูลของ "${formName}" ใช่หรือไม่?`}
        confirmLabel="ยืนยันบันทึก"
        type="info"
        onConfirm={handleEditConfirm}
        onClose={() => setIsConfirmEditOpen(false)}
      />
    </div>
  );
};
export default RoleList;
