import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';
import type { EmissionFactorDto } from '@enterprise/shared-types';
import { X, Settings2, ExternalLink, BookOpen, Pencil } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  scope1: 'Scope 1 — การเผาไหม้โดยตรง',
  scope2: 'Scope 2 — พลังงานทางอ้อม',
  scope3: 'Scope 3 — การปล่อยทางอ้อมอื่นๆ',
  reduction: 'Reduction — กิจกรรมลดการปล่อย'
};

const CATEGORY_COLORS: Record<string, string> = {
  scope1: 'bg-rose-100 text-rose-700 border border-rose-200',
  scope2: 'bg-orange-100 text-orange-700 border border-orange-200',
  scope3: 'bg-sky-100 text-sky-700 border border-sky-200',
  reduction: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
};

const HEADER_GRADIENT: Record<string, string> = {
  scope1: 'from-rose-600 to-red-600',
  scope2: 'from-orange-500 to-amber-500',
  scope3: 'from-sky-600 to-blue-600',
  reduction: 'from-emerald-600 to-teal-600'
};

interface EmissionFactorViewModalProps {
  isOpen: boolean;
  factorId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

const InfoRow: React.FC<{ label: string; value?: string | number | null; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`text-slate-800 font-semibold ${mono ? 'font-mono' : ''}`}>
      {value ?? <span className="text-slate-300">-</span>}
    </span>
  </div>
);

export const EmissionFactorViewModal: React.FC<EmissionFactorViewModalProps> = ({
  isOpen, factorId, onClose, onEdit
}) => {
  const { data: factor, isLoading } = useQuery<EmissionFactorDto>({
    queryKey: ['emission-factor-detail', factorId],
    queryFn: async () => {
      const res: any = await api.get(`/emission-factors/${factorId}`);
      return res.data;
    },
    enabled: isOpen && !!factorId
  });

  if (!isOpen) return null;

  const gradient = factor ? (HEADER_GRADIENT[factor.category] ?? 'from-slate-600 to-slate-700') : 'from-slate-600 to-slate-700';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-lg bg-white text-slate-800 z-10 flex flex-col overflow-hidden max-h-[90vh] border border-slate-200">

        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} px-6 py-5 flex items-start justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Settings2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                {factor ? (CATEGORY_LABELS[factor.category] ?? factor.category) : '...'}
              </p>
              <h3 className="text-white font-bold text-base leading-tight mt-0.5">
                {factor?.name ?? '...'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : factor ? (
            <div className="space-y-5">
              {/* EF Value highlight */}
              <div className={`rounded-xl p-5 text-center bg-gradient-to-br ${gradient} bg-opacity-10 border border-slate-100`}
                style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                <p className="text-xs text-slate-500 mb-1">ค่าสัมประสิทธิ์ (Emission Factor)</p>
                <p className="text-4xl font-black font-mono text-slate-800">
                  {factor.value.toLocaleString('th-TH', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                </p>
                <span className="text-sm text-slate-500 font-mono mt-1 block">{factor.unit}</span>
              </div>

              {/* Details */}
              <div>
                <InfoRow label="ปีงบประมาณ" value={factor.year + 543} />
                <InfoRow label="ประเภท" value={CATEGORY_LABELS[factor.category] ?? factor.category} />
                <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                  <span className="text-slate-500 font-medium">ประเภท Badge</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[factor.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {factor.category}
                  </span>
                </div>
                <InfoRow label="รหัส Key" value={factor.key} mono />
                <InfoRow label="ชื่อกิจกรรม" value={factor.name} />
                <InfoRow label="ค่า EF" value={`${factor.value}`} mono />
                <InfoRow label="หน่วย" value={factor.unit} mono />
              </div>

              {/* Source reference */}
              {factor.source && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <BookOpen size={12} /> แหล่งที่มาของข้อมูล
                  </p>
                  <p className="text-sm text-slate-700">{factor.source}</p>
                  {factor.sourceUrl && (
                    <a href={factor.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 hover:underline font-medium">
                      <ExternalLink size={12} /> เปิดลิงก์อ้างอิง
                    </a>
                  )}
                </div>
              )}

              {/* Audit */}
              <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-100">
                {factor.updatedAt && (
                  <p>อัปเดตล่าสุด: {new Date(factor.updatedAt).toLocaleString('th-TH')}</p>
                )}
                {factor.updatedBy && <p>โดย: {factor.updatedBy}</p>}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">ไม่พบข้อมูล</p>
          )}
        </div>

        {/* Footer */}
        {factor && (
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white transition-colors">
              ปิด
            </button>
            <button onClick={() => { onClose(); onEdit(factor.id); }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
              <Pencil size={14} /> แก้ไข
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
