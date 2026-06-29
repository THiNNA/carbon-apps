import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import type { PermissionDto } from '@enterprise/shared-types';
import { Search } from 'lucide-react';
import { formatDate } from '../../services/date.js';

export const PermissionList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery<{ items: PermissionDto[]; meta: any }>({
    queryKey: ['permissions', page, search, sortBy, sortOrder],
    queryFn: async () => {
      const response: any = await api.get('/permissions', {
        params: { page, limit, search, sortBy, sortOrder }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  const columns: Column<PermissionDto>[] = [
    {
      key: 'name',
      header: 'รหัสสิทธิ์ (Token)',
      sortable: true,
      render: (row) => (
        <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold">
          {row.name}
        </code>
      )
    },
    { key: 'description', header: 'คำอธิบาย' },
    {
      key: 'createdAt',
      header: 'วันที่สร้าง',
      sortable: true,
      render: (row) => formatDate(row.createdAt)
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">ทำเนียบสิทธิ์การใช้งาน</h2>
        <p className="text-sm text-slate-400">เรียกดูรายการรหัสสิทธิ์ระบบที่ควบคุมและจำกัดการเข้าใช้งานตามบทบาท (RBAC)</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-slate-800">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาตามรหัสสิทธิ์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
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
        emptyMessage="No permissions found"
      />
    </div>
  );
};
export default PermissionList;
