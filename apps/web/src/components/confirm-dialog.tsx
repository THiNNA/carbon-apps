import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  showCancel = true,
  type = 'warning',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  const typeColorClasses = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    info: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white'
  };

  const typeIconColor = {
    danger: 'text-rose-600 bg-rose-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-emerald-600 bg-emerald-100'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Dialog container */}
      <div className="relative glass-panel rounded-xl shadow-2xl p-6 max-w-md w-full bg-white/95 text-slate-900 z-10">
        <div className="flex gap-4">
          <div className={`p-3 rounded-full flex-shrink-0 self-start ${typeIconColor[type]}`}>
            {type === 'danger' ? (
              <span className="text-xl font-bold">⚠️</span>
            ) : type === 'warning' ? (
              <span className="text-xl font-bold">🔔</span>
            ) : (
              <span className="text-xl font-bold">ℹ️</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${typeColorClasses[type]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
