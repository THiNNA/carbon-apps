import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.js';
import { useToast } from '../../contexts/toast-context.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import { ConfirmDialog } from '../../components/confirm-dialog.js';
import type { UserDto, RoleDto, OrganizationDto, DepartmentDto } from '@enterprise/shared-types';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context.js';
import { formatDateTime } from '../../services/date.js';
import { Select2 } from '../../components/select2.js';


export const UserList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { payload } = useAuth();
  const isSuperAdmin = payload?.roles.includes('SuperAdmin') || false;
  const isAdmin = payload?.roles.includes('Admin') || false;

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // List Filters
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');

  useEffect(() => {
    if (payload) {
      setFilterOrgId(isSuperAdmin ? '' : (payload.organizationId || ''));
      setFilterDeptId(isSuperAdmin || isAdmin ? '' : (payload.departmentId || ''));
    }
  }, [payload, isSuperAdmin, isAdmin]);

  // Modals & Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToActOn, setUserToActOn] = useState<UserDto | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formOrgId, setFormOrgId] = useState('');
  const [formOrgName, setFormOrgName] = useState(''); // for read-only display
  const [formDeptId, setFormDeptId] = useState('');

  // Fetch Users
  const { data, isLoading } = useQuery<{ items: UserDto[]; meta: any }>({
    queryKey: ['users', page, search, sortBy, sortOrder, filterOrgId, filterDeptId],
    queryFn: async () => {
      const response: any = await api.get('/users', {
        params: {
          page, limit, search, sortBy, sortOrder,
          organizationId: filterOrgId || undefined,
          departmentId: filterDeptId || undefined
        }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  // Fetch Roles for drop-down selection
  const { data: rolesData } = useQuery<RoleDto[]>({
    queryKey: ['rolesListSelect'],
    queryFn: async () => {
      const response: any = await api.get('/roles', { params: { limit: 100 } });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,  // P2-B: roles เปลี่ยนน้อย cache 5 นาที
  });

  const { data: orgsData } = useQuery<OrganizationDto[]>({
    queryKey: ['orgsSelect'],
    queryFn: async () => {
      const response: any = await api.get('/organizations', { params: { limit: 100 } });
      return response.data;
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,  // P2-B: orgs เปลี่ยนน้อย cache 5 นาที
  });

  // Departments for list filter (scoped by filterOrgId for SuperAdmin or auto-scoped for Admin)
  const { data: filterDeptsData } = useQuery<DepartmentDto[]>({
    queryKey: ['deptsFilterSelect', filterOrgId],
    queryFn: async () => {
      const response: any = await api.get('/departments/all', {
        params: { organizationId: filterOrgId || undefined }
      });
      return response.data;
    },
    enabled: isSuperAdmin || isAdmin,
    staleTime: 5 * 60 * 1000,  // P2-B: depts เปลี่ยนน้อย cache 5 นาที
  });

  // Departments for form (scoped by formOrgId selection)
  const { data: deptsData } = useQuery<DepartmentDto[]>({
    queryKey: ['deptsSelect', formOrgId],
    queryFn: async () => {
      const response: any = await api.get('/departments/all', {
        params: { organizationId: formOrgId || undefined }
      });
      return response.data;
    }
  });

  // Single org query for non-SuperAdmin to get org name
  const { data: adminOrgData } = useQuery<OrganizationDto>({
    queryKey: ['orgSingle', payload?.organizationId],
    queryFn: async () => {
      const response: any = await api.get(`/organizations/${payload?.organizationId}`);
      return response.data;
    },
    enabled: !isSuperAdmin && !!payload?.organizationId
  });

  const roles = rolesData || [];
  const orgs = orgsData || [];
  const depts = deptsData || [];
  // Resolve org name for non-SuperAdmin read-only display
  const adminOrgName = adminOrgData?.name || formOrgName || '';

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUser: any) => api.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User created successfully!', 'success');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create user', 'error');
    }
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: (updatedUser: any) => api.put(`/users/${selectedUser?.id}`, updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User updated successfully!', 'success');
      setIsEditOpen(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update user', 'error');
    }
  });

  // Soft Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('User deleted successfully!', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  });

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRoleId('');
    // Default to admin's own organization when not SuperAdmin
    const adminOrgId = isSuperAdmin ? '' : (payload?.organizationId || '');
    setFormOrgId(adminOrgId);
    setFormOrgName('');
    setFormDeptId('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: UserDto) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRoleId(user.roleId || '');
    const orgId = user.department?.organizationId || (isSuperAdmin ? '' : (payload?.organizationId || ''));
    setFormOrgId(orgId);
    setFormOrgName(user.department?.organization?.name || '');
    setFormDeptId(user.departmentId || '');
    setIsEditOpen(true);
  };

  const handleOpenDetail = (user: UserDto) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
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
      email: formEmail,
      password: formPassword || undefined,
      roleId: formRoleId || undefined,
      departmentId: formDeptId || undefined
    });
  };

  const handleEditConfirm = () => {
    updateMutation.mutate({
      name: formName,
      email: formEmail,
      password: formPassword || undefined,
      roleId: formRoleId || undefined,
      departmentId: formDeptId || null
    });
  };

  const handleDeleteConfirm = () => {
    if (userToActOn) {
      deleteMutation.mutate(userToActOn.id);
    }
  };

  const columns: Column<UserDto>[] = [
    {
      key: 'name',
      header: 'ชื่อเต็ม',
      sortable: true,
      render: (row) => (
        <div className="font-semibold text-slate-800">
          {row.name}
        </div>
      )
    },
    { key: 'email', header: 'อีเมล', sortable: true },
    {
      key: 'role',
      header: 'บทบาท',
      align: 'center',
      render: (row) => (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
          {row.role?.name || 'ไม่มีบทบาท'}
        </span>
      )
    },
    {
      key: 'department' as any,
      header: 'หน่วยงาน',
      render: (row) => row.department ? (
        <div className="text-xs">
          <p className="font-semibold text-slate-700">{row.department.name}</p>
          <p className="text-slate-405">{row.department.organization?.name || ''}</p>
        </div>
      ) : <span className="text-slate-350 text-xs">—</span>
    },
    {
      key: 'createdAt',
      header: 'วันที่ลงทะเบียน',
      sortable: true,
      align: 'center',
      render: (row: any) => (
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
            title="แก้ไขข้อมูล"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              setUserToActOn(row);
              setIsDeleteOpen(true);
            }}
            className="p-1.5 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 rounded-md transition-colors"
            title="ลบผู้ใช้งาน"
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
          <h2 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h2>
          <p className="text-sm text-slate-400">ดู รายละเอียด สร้าง แก้ไข และลบข้อมูลผู้ใช้งานในระบบ</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow transition-colors text-sm"
        >
          <Plus size={16} />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-slate-800">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-405">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาตามชื่อ หรือ อีเมล..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
          />
        </div>
        {isSuperAdmin && (
          <div className="flex-1">
            <Select2
              value={filterOrgId}
              onChange={(val) => { setFilterOrgId(val); setFilterDeptId(''); setPage(1); }}
              placeholder="ทุกองค์กร"
              options={[
                { value: '', label: 'ทุกองค์กร' },
                ...(orgsData || []).map((o) => ({ value: o.id, label: o.name }))
              ]}
            />
          </div>
        )}
        {(isSuperAdmin || isAdmin) && (
          <div className="flex-1">
            <Select2
              disabled={isSuperAdmin && !filterOrgId}
              value={filterDeptId}
              onChange={(val) => { setFilterDeptId(val); setPage(1); }}
              placeholder="ทุกหน่วยงาน"
              options={[
                { value: '', label: 'ทุกหน่วยงาน' },
                ...(filterOrgId && filterDeptsData ? filterDeptsData.map((d) => ({ value: d.id, label: d.name })) : [])
              ]}
            />
          </div>
        )}

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
        emptyMessage="ไม่พบผู้ใช้งานตามเงื่อนไขที่กำหนด"
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="ลบผู้ใช้งาน"
        message={`คุณต้องการลบผู้ใช้งาน ${userToActOn?.name} ใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้`}
        confirmLabel="ยืนยันการลบ"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteOpen(false)}
      />

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-md w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">สร้างผู้ใช้งานใหม่</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อเต็ม</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">อีเมล</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">บทบาท</label>
                <Select2
                  value={formRoleId}
                  onChange={(val) => setFormRoleId(val)}
                  placeholder="เลือกบทบาท"
                  options={roles
                    .filter((r) => isSuperAdmin || r.name !== 'SuperAdmin')
                    .map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">องค์กร</label>
                {isSuperAdmin ? (
                  <Select2
                    value={formOrgId}
                    onChange={(val) => { setFormOrgId(val); setFormDeptId(''); }}
                    placeholder="-- เลือกองค์กร --"
                    options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                  />
                ) : (
                  <input
                    type="text"
                    value={adminOrgName}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm cursor-not-allowed font-bold"
                  />
                )}
              </div>
              {formOrgId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">หน่วยงาน</label>
                  <Select2
                    value={formDeptId}
                    onChange={(val) => setFormDeptId(val)}
                    placeholder="-- เลือกหน่วยงาน --"
                    options={depts.filter(d => d.organizationId === formOrgId).map((d) => ({ value: d.id, label: d.name }))}
                    openUp={true}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
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
                  สร้างผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-md w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">แก้ไขข้อมูลผู้ใช้งาน</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">ชื่อเต็ม</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">อีเมล</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  รหัสผ่านใหม่ (ไม่บังคับ)
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="เว้นว่างไว้เพื่อใช้รหัสผ่านเดิม"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">บทบาท</label>
                <Select2
                  value={formRoleId}
                  onChange={(val) => setFormRoleId(val)}
                  placeholder="เลือกบทบาท"
                  options={roles
                    .filter((r) => isSuperAdmin || r.name !== 'SuperAdmin')
                    .map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">องค์กร</label>
                {isSuperAdmin ? (
                  <Select2
                    value={formOrgId}
                    onChange={(val) => { setFormOrgId(val); setFormDeptId(''); }}
                    placeholder="-- เลือกองค์กร --"
                    options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                  />
                ) : (
                  <input
                    type="text"
                    value={adminOrgName}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm cursor-not-allowed font-bold"
                  />
                )}
              </div>
              {formOrgId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">หน่วยงาน</label>
                  <Select2
                    value={formDeptId}
                    onChange={(val) => setFormDeptId(val)}
                    placeholder="-- เลือกหน่วยงาน --"
                    options={depts.filter(d => d.organizationId === formOrgId).map((d) => ({ value: d.id, label: d.name }))}
                    openUp={true}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
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

      {isDetailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-md w-full bg-white/95 text-slate-800 z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">รายละเอียดผู้ใช้งาน</h3>
            <div className="space-y-3.5 text-sm text-slate-800">
              {/* <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">รหัสผู้ใช้งาน</span>
                <span className="col-span-2 text-slate-800 break-all font-mono text-xs">{selectedUser.id}</span>
              </div> */}
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">ชื่อเต็ม</span>
                <span className="col-span-2 text-slate-850 font-medium">{selectedUser.name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">อีเมล</span>
                <span className="col-span-2 text-slate-800">{selectedUser.email}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">บทบาท</span>
                <span className="col-span-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
                    {selectedUser.role?.name || 'ไม่มีบทบาท'}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">หน่วยงาน</span>
                <span className="col-span-2">
                  {selectedUser.department ? (
                    <span>
                      <span className="font-semibold">{selectedUser.department.name}</span><br />
                      <span className="text-slate-400 text-xs">({selectedUser.department.organization?.name})</span>
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">วันที่ลงทะเบียน</span>
                <span className="col-span-2 text-slate-850">
                  {formatDateTime(selectedUser.createdAt)}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-400">ผู้สร้างบัญชี</span>
                <span className="col-span-2 text-slate-800">{selectedUser.createdBy || 'SYSTEM'}</span>
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
        title="ยืนยันการสร้างผู้ใช้งาน"
        message={`คุณต้องการสร้างผู้ใช้งานใหม่ "${formName}" ใช่หรือไม่?`}
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
export default UserList;
