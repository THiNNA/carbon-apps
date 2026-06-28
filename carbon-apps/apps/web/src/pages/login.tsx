import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context.js';
import { useToast } from '../contexts/toast-context.js';
import api from '../services/api.js';
import { LoadingSpinner } from '../components/loading-spinner.js';


export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response: any = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;

      login(accessToken, refreshToken, user);
      showToast(`ยินดีต้อนรับกลับมา, ${user.name}!`, 'success');
      navigate('/');
    } catch (error: any) {
      showToast(error.message || 'เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบอีเมลและรหัสผ่าน', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

      <div className="relative w-full max-w-md p-8 glass-panel rounded-2xl shadow-xl bg-white/85 text-slate-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <img src="/favicon.svg" alt="Logo" className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ยินดีต้อนรับ</h2>
          <p className="text-sm text-slate-550 mt-1">ลงชื่อเข้าใช้เพื่อจัดการระบบคาร์บอนฟุตพริ้นท์</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              ที่อยู่อีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@example.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all text-sm mt-8"
          >
            {loading ? <LoadingSpinner size="sm" color="text-white" /> : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
