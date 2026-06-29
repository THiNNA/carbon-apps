import React from 'react';
import { LoadingSpinner } from './loading-spinner.js';

export interface Column<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  emptyMessage?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage = 'ไม่พบข้อมูล'
}) => {
  const handleSortClick = (key: string) => {
    if (!onSort) return;
    const isCurrent = sortBy === key;
    const newOrder = isCurrent && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {columns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSortClick(col.key)}
                    className={`px-6 py-4 whitespace-nowrap text-center ${
                      col.sortable ? 'cursor-pointer select-none hover:text-slate-800' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span className="text-slate-400 text-[10px] shrink-0">
                          {isSorted ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                  <p className="text-xs text-slate-400 mt-2">Loading data...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <span className="text-2xl block mb-2">📁</span>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={(row as any).id || index} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((col) => {
                    const cellAlignClass = 
                      col.align === 'right' ? 'text-right' :
                      col.align === 'center' ? 'text-center' :
                      'text-left';
                    return (
                      <td key={col.key} className={`px-6 py-3.5 whitespace-nowrap ${cellAlignClass}`}>
                        {col.render ? col.render(row) : (row as any)[col.key] || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium">
            แสดงหน้า <span className="font-semibold text-slate-800">{currentPage}</span> จาก{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span> (ทั้งหมด {totalItems} รายการ)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              ก่อนหน้า
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currentPage === p
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
