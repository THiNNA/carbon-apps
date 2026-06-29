import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import { DataTable } from '../../components/data-table.js';
import type { Column } from '../../components/data-table.js';
import type { TransactionLogDto } from '@enterprise/shared-types';
import { Eye, Search, History } from 'lucide-react';
import { formatDateTime } from '../../services/date.js';
import { Select2 } from '../../components/select2.js';

const formatDateToLocalInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayString = () => formatDateToLocalInput(new Date());

const getOneMonthAgoString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return formatDateToLocalInput(d);
};

export const TransactionLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState(getOneMonthAgoString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedLog, setSelectedLog] = useState<TransactionLogDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Transaction Logs
  const { data, isLoading } = useQuery<{ items: TransactionLogDto[]; meta: any }>({
    queryKey: ['transactionLogs', page, search, filterModule, filterAction, startDate, endDate, sortBy, sortOrder],
    queryFn: async () => {
      const response: any = await api.get('/transaction-logs', {
        params: {
          page,
          limit,
          search: search || undefined,
          module: filterModule || undefined,
          action: filterAction || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy,
          sortOrder
        }
      });
      return { items: response.data, meta: response.meta };
    }
  });

  const handleOpenDetail = (log: TransactionLogDto) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'LOGIN':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const translateAction = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'สร้างข้อมูล';
      case 'UPDATE':
        return 'แก้ไขข้อมูล';
      case 'DELETE':
        return 'ลบข้อมูล';
      case 'LOGIN':
        return 'เข้าสู่ระบบ';
      default:
        return action;
    }
  };

  const translateModule = (module: string) => {
    switch (module) {
      case 'Auth':
        return 'การยืนยันตัวตน';
      case 'CarbonRecord':
        return 'บันทึกคาร์บอน';
      case 'Organization':
        return 'องค์กร';
      case 'Department':
        return 'หน่วยงาน';
      case 'User':
        return 'ผู้ใช้งาน';
      case 'Role':
        return 'บทบาท';
      case 'EmissionFactor':
        return 'สัมประสิทธิ์คาร์บอน (EF)';
      default:
        return module;
    }
  };

  // เปรียบเทียบ JSON ความแตกต่างเก่า/ใหม่
  const renderJsonDiff = (oldStr: string | null | undefined, newStr: string | null | undefined) => {
    if (!oldStr && !newStr) return <span className="text-slate-400 text-xs">ไม่มีข้อมูล</span>;

    let oldObj: any = null;
    let newObj: any = null;

    try { oldObj = oldStr ? JSON.parse(oldStr) : null; } catch (e) {}
    try { newObj = newStr ? JSON.parse(newStr) : null; } catch (e) {}

    // หากไม่ใช่ object หรือพาร์สไม่ได้ ก็แสดงข้อความดิบ
    if (oldStr && !oldObj) oldObj = { value: oldStr };
    if (newStr && !newObj) newObj = { value: newStr };

    // ลบฟิลด์ที่ไม่อยากแสดงในการเปรียบเทียบ เช่น ids, tokens, dates ที่เป็น metadata
    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const clean = { ...obj };
      delete clean.id;
      delete clean.createdAt;
      delete clean.updatedAt;
      delete clean.deletedAt;
      delete clean.createdBy;
      delete clean.updatedBy;
      delete clean.deletedBy;
      delete clean.password; // ซ่อนเพื่อความปลอดภัย
      return clean;
    };

    const cleanOld = sanitize(oldObj);
    const cleanNew = sanitize(newObj);

    // กรณี 1: ลบข้อมูล (Delete)
    if (cleanOld && !cleanNew) {
      return (
        <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-4 font-mono text-xs text-rose-700 max-h-60 overflow-y-auto">
          <h4 className="font-bold text-rose-800 mb-2 font-sans">ข้อมูลที่ถูกลบ:</h4>
          <pre>{JSON.stringify(cleanOld, null, 2)}</pre>
        </div>
      );
    }

    // กรณี 2: สร้างข้อมูล (Create)
    if (!cleanOld && cleanNew) {
      return (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 font-mono text-xs text-emerald-700 max-h-60 overflow-y-auto">
          <h4 className="font-bold text-emerald-800 mb-2 font-sans">ข้อมูลที่ถูกสร้าง:</h4>
          <pre>{JSON.stringify(cleanNew, null, 2)}</pre>
        </div>
      );
    }

    // กรณี 3: แก้ไขข้อมูล (Update)
    if (cleanOld && cleanNew) {
      const allKeys = Array.from(new Set([...Object.keys(cleanOld), ...Object.keys(cleanNew)]));
      const diffs = allKeys.filter(k => JSON.stringify(cleanOld[k]) !== JSON.stringify(cleanNew[k]));

      if (diffs.length === 0) {
        return <span className="text-slate-400 text-xs">ไม่มีการเปลี่ยนแปลงข้อมูลสำคัญ (เช่น มีการปรับปรุงเฉพาะฟิลด์ meta หรือ updatedBy เท่านั้น)</span>;
      }

      return (
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">รายการข้อมูลที่เปลี่ยนแปลง:</h4>
          <div className="border border-slate-150 rounded-lg divide-y divide-slate-100 overflow-hidden text-xs max-h-80 overflow-y-auto shadow-inner">
            {diffs.map(k => {
              const oldVal = cleanOld[k];
              const newVal = cleanNew[k];
              
              const formatVal = (val: any) => {
                if (val === undefined || val === null) return '—';
                if (typeof val === 'object') return JSON.stringify(val);
                if (typeof val === 'boolean') return val ? 'true' : 'false';
                return String(val);
              };

              return (
                <div key={k} className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2 hover:bg-slate-50/30">
                  <span className="font-semibold text-slate-600 break-all">{k}</span>
                  <div className="text-rose-600 bg-rose-50/40 px-2.5 py-1 rounded font-mono break-all line-through">
                    {formatVal(oldVal)}
                  </div>
                  <div className="text-emerald-600 bg-emerald-50/40 px-2.5 py-1 rounded font-mono break-all font-semibold">
                    {formatVal(newVal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <span className="text-slate-400 text-xs">ไม่มีข้อมูล</span>;
  };

  const renderJsonBlock = (title: string, jsonStr: string | null | undefined, emptyMsg: string, themeColor: 'cyan' | 'slate') => {
    if (!jsonStr) {
      return (
        <div className="space-y-1.5 flex-1">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-400 italic">
            {emptyMsg}
          </div>
        </div>
      );
    }

    let formatted = jsonStr;
    try {
      const obj = JSON.parse(jsonStr);
      formatted = JSON.stringify(obj, null, 2);
    } catch (e) {}

    const headerBg = themeColor === 'cyan' ? 'bg-cyan-50/10 border-cyan-100' : 'bg-slate-50/50 border-slate-150';
    const textClass = themeColor === 'cyan' ? 'text-cyan-800' : 'text-slate-700';

    return (
      <div className="space-y-1.5 flex-1 min-w-[280px]">
        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-3 border rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto ${headerBg} ${textClass} shadow-inner`}>
          <pre className="whitespace-pre-wrap break-all">{formatted}</pre>
        </div>
      </div>
    );
  };

  const columns: Column<TransactionLogDto>[] = [
    {
      key: 'createdAt',
      header: 'วัน/เวลา',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {formatDateTime(row.createdAt)}
        </span>
      )
    },
    {
      key: 'userEmail',
      header: 'ผู้ดำเนินการ',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-700">{row.userName || 'ระบบ'}</p>
          <p className="text-slate-400 font-mono">{row.userEmail || 'system@system.local'}</p>
        </div>
      )
    },
    {
      key: 'action',
      header: 'กิจกรรม',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getActionBadgeColor(row.action)}`}>
          {translateAction(row.action)}
        </span>
      )
    },
    {
      key: 'module',
      header: 'ระบบ/โมดูล',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
          {translateModule(row.module)}
        </span>
      )
    },
    {
      key: 'targetName',
      header: 'รายละเอียดรายการเป้าหมาย',
      render: (row) => (
        <div className="max-w-xs md:max-w-md truncate" title={row.targetName || ''}>
          <span className="text-xs text-slate-700 font-medium">
            {row.targetName || '—'}
          </span>
          {row.targetId && (
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.targetId}</p>
          )}
        </div>
      )
    },
    {
      key: 'ipAddress',
      header: 'หมายเลขไอพี (IP)',
      align: 'center',
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          {row.ipAddress || '—'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'ตรวจสอบ',
      align: 'center',
      render: (row) => (
        <button
          onClick={() => handleOpenDetail(row)}
          className="p-1.5 text-cyan-600 bg-cyan-50/50 hover:bg-cyan-100 hover:text-cyan-700 rounded-md transition-colors"
          title="ดูรายละเอียดข้อมูลธุรกรรม"
        >
          <Eye size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-cyan-600" size={24} />
            ประวัติธุรกรรมระบบ
          </h2>
          <p className="text-sm text-slate-400">ตรวจสอบและติดตามการเปลี่ยนแปลงข้อมูลทั้งหมดของระบบ (Audit Trail)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-slate-800 items-end">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">ค้นหาข้อมูล</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-405">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="ค้นหาตามอีเมล หรือ เป้าหมาย..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all h-[38px]"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">โมดูลระบบ</label>
          <Select2
            value={filterModule}
            onChange={(val) => { setFilterModule(val); setPage(1); }}
            placeholder="ทุกโมดูล"
            options={[
              { value: '', label: 'ทุกระบบ/โมดูล' },
              { value: 'Auth', label: 'การยืนยันตัวตน' },
              { value: 'CarbonRecord', label: 'บันทึกคาร์บอน' },
              { value: 'Organization', label: 'องค์กร' },
              { value: 'Department', label: 'หน่วยงาน' },
              { value: 'User', label: 'ผู้ใช้งาน' },
              { value: 'Role', label: 'บทบาท' },
              { value: 'EmissionFactor', label: 'สัมประสิทธิ์คาร์บอน (EF)' }
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">กิจกรรม</label>
          <Select2
            value={filterAction}
            onChange={(val) => { setFilterAction(val); setPage(1); }}
            placeholder="ทุกกิจกรรม"
            options={[
              { value: '', label: 'ทุกกิจกรรม' },
              { value: 'LOGIN', label: 'เข้าสู่ระบบ (LOGIN)' },
              { value: 'CREATE', label: 'สร้างข้อมูล (CREATE)' },
              { value: 'UPDATE', label: 'แก้ไขข้อมูล (UPDATE)' },
              { value: 'DELETE', label: 'ลบข้อมูล (DELETE)' }
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all h-[38px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all h-[38px]"
          />
        </div>
      </div>

      {(search || filterModule || filterAction || startDate !== getOneMonthAgoString() || endDate !== getTodayString()) && (
        <div className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2.5 rounded-lg px-4 text-xs text-slate-600 shadow-sm animate-fade-in">
          <span>พบผลการค้นหาตัวกรองทั้งหมด <strong>{data?.meta?.total || 0}</strong> รายการ</span>
          <button
            onClick={() => {
              setSearch('');
              setFilterModule('');
              setFilterAction('');
              setStartDate(getOneMonthAgoString());
              setEndDate(getTodayString());
              setPage(1);
            }}
            className="text-cyan-600 hover:text-cyan-700 font-bold transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

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
        emptyMessage="ไม่พบรายการประวัติธุรกรรมตามเงื่อนไขที่กำหนด"
      />

      {isDetailOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-4xl w-full bg-white/95 text-slate-800 z-10 flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2 flex items-center gap-2 shrink-0">
              <History className="text-cyan-600" size={20} />
              รายละเอียดประวัติธุรกรรม
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div className="space-y-2">
                  <p><span className="font-semibold text-slate-400">วัน/เวลาดำเนินการ:</span> <span className="text-slate-800 font-mono font-semibold">{formatDateTime(selectedLog.createdAt)}</span></p>
                  <p><span className="font-semibold text-slate-400">ผู้ดำเนินการ:</span> <span className="text-slate-800">{selectedLog.userName || 'ระบบ'} ({selectedLog.userEmail || 'system@system.local'})</span></p>
                  <p><span className="font-semibold text-slate-400">โมดูลระบบ:</span> <span className="text-slate-800 font-semibold">{translateModule(selectedLog.module)}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-semibold text-slate-400">ประเภทกิจกรรม:</span> <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getActionBadgeColor(selectedLog.action)}`}>{translateAction(selectedLog.action)}</span></p>
                  <p><span className="font-semibold text-slate-400">หมายเลขไอพี:</span> <span className="text-slate-800 font-mono">{selectedLog.ipAddress || '—'}</span></p>
                  <p><span className="font-semibold text-slate-400">เครื่องมือ (User Agent):</span> <span className="text-slate-500 truncate block max-w-sm" title={selectedLog.userAgent || ''}>{selectedLog.userAgent || '—'}</span></p>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">รายการเป้าหมาย</span>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800">
                  <p className="font-bold text-slate-800">{selectedLog.targetName || '—'}</p>
                  {selectedLog.targetId && (
                    <p className="text-[10px] text-slate-450 font-mono mt-1">Target ID: {selectedLog.targetId}</p>
                  )}
                </div>
              </div>

              {/* Request & Response Data Section */}
              <div className="flex flex-wrap gap-4">
                {renderJsonBlock('ข้อมูลส่งเข้า (Request Data)', selectedLog.requestData, 'ไม่มีข้อมูลการส่งเข้า API', 'cyan')}
                {renderJsonBlock('ข้อมูลตอบกลับ (Response Data)', selectedLog.responseData, 'ไม่มีข้อมูลการตอบกลับจาก API', 'slate')}
              </div>

              {/* JSON Diff section */}
              <div>
                {renderJsonDiff(selectedLog.oldValue, selectedLog.newValue)}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4 shrink-0">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionLogs;
