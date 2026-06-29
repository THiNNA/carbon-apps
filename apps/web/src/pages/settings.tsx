import React, { useState } from 'react';
import { useToast } from '../contexts/toast-context.js';
import api from '../services/api.js';
import { LoadingSpinner } from '../components/loading-spinner.js';

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      showToast('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('รหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/settings', { password });
      showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าบัญชีผู้ใช้</h2>
        <p className="text-sm text-slate-400">ตั้งค่าความปลอดภัยของรหัสผ่านผู้ใช้งาน</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
        <h3 className="text-base font-bold text-slate-800 mb-4">เปลี่ยนรหัสผ่าน</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all text-sm flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" color="text-white" />}
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Settings;
