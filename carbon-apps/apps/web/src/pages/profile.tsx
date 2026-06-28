import React, { useState } from 'react';
import { useAuth } from '../contexts/auth-context.js';
import { useToast } from '../contexts/toast-context.js';
import api from '../services/api.js';
import { LoadingSpinner } from '../components/loading-spinner.js';
import { ConfirmDialog } from '../components/confirm-dialog.js';
import { User, Lock } from 'lucide-react';

type SettingsSection = 'profile' | 'password';

const settingsNav: { id: SettingsSection; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: <User size={18} />, description: 'แก้ไขชื่อและอีเมล' },
  { id: 'password', label: 'เปลี่ยนรหัสผ่าน', icon: <Lock size={18} />, description: 'ตั้งค่าความปลอดภัยของบัญชี' },
];

export const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Confirmation States
  const [isConfirmProfileOpen, setIsConfirmProfileOpen] = useState(false);
  const [isConfirmPasswordOpen, setIsConfirmPasswordOpen] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      showToast('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
      return;
    }
    setIsConfirmProfileOpen(true);
  };

  const executeUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', { name, email });
      const accessToken = localStorage.getItem('accessToken') || '';
      const refreshToken = localStorage.getItem('refreshToken') || '';
      const updatedUser = { ...user!, name, email };
      login(accessToken, refreshToken, updatedUser);
      showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!', 'success');
    } catch (error: any) {
      showToast(error.message || 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      showToast('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('รหัสผ่านไม่ตรงกัน', 'error');
      return;
    }
    setIsConfirmPasswordOpen(true);
  };

  const executeUpdatePassword = async () => {
    setPasswordLoading(true);
    try {
      await api.put('/auth/settings', { password });
      showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าบัญชี</h2>
        <p className="text-sm text-slate-400">อัปเดตข้อมูลส่วนตัวและตั้งค่าความปลอดภัยของบัญชีผู้ใช้</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Settings Sidebar */}
        <nav className="w-full md:w-56 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {settingsNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-l-2 ${
                activeSection === item.id
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-800'
              }`}
            >
              <span className={activeSection === item.id ? 'text-emerald-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{item.label}</p>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">ข้อมูลส่วนตัว</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    ที่อยู่อีเมล
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all text-sm flex items-center gap-2"
                  >
                    {profileLoading && <LoadingSpinner size="sm" color="text-white" />}
                    บันทึกการเปลี่ยนแปลง
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSection === 'password' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-slate-800">
              <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">เปลี่ยนรหัสผ่าน</h3>
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
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all text-sm flex items-center gap-2"
                  >
                    {passwordLoading && <LoadingSpinner size="sm" color="text-white" />}
                    เปลี่ยนรหัสผ่าน
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmProfileOpen}
        title="ยืนยันการอัปเดตข้อมูลโปรไฟล์"
        message="คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลส่วนตัวใช่หรือไม่?"
        confirmLabel="ยืนยันบันทึก"
        type="info"
        onConfirm={executeUpdateProfile}
        onClose={() => setIsConfirmProfileOpen(false)}
      />

      <ConfirmDialog
        isOpen={isConfirmPasswordOpen}
        title="ยืนยันการเปลี่ยนรหัสผ่าน"
        message="คุณต้องการเปลี่ยนรหัสผ่านบัญชีนี้ใช่หรือไม่?"
        confirmLabel="ยืนยันเปลี่ยนรหัสผ่าน"
        type="warning"
        onConfirm={executeUpdatePassword}
        onClose={() => setIsConfirmPasswordOpen(false)}
      />
    </div>
  );
};
export default Profile;
