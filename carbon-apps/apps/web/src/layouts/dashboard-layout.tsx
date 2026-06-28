import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context.js';
import { Breadcrumbs } from '../components/breadcrumb.js';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  User,
  LogOut,
  Menu,
  X,
  Leaf,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  DatabaseZap,
  Settings2
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, payload, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(true);
  const [isMobileAdminOpen, setIsMobileAdminOpen] = React.useState(true);
  const [isOrgOpen, setIsOrgOpen] = React.useState(true);
  const [isMobileOrgOpen, setIsMobileOrgOpen] = React.useState(true);
  const [isCarbonOpen, setIsCarbonOpen] = React.useState(true);
  const [isMobileCarbonOpen, setIsMobileCarbonOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasPermission = (permission: string) => {
    return payload?.permissions.includes(permission) || payload?.roles.includes('SuperAdmin');
  };

  const adminItems = [
    { label: 'จัดการผู้ใช้งาน', path: '/users', icon: <Users size={18} className="text-sky-400" />, show: hasPermission('users:read') },
    { label: 'จัดการบทบาท', path: '/roles', icon: <Shield size={18} className="text-indigo-400" />, show: hasPermission('roles:read') },
    { label: 'สิทธิ์การใช้งาน', path: '/permissions', icon: <Key size={18} className="text-amber-400" />, show: hasPermission('permissions:read') },
    { label: 'ตั้งค่าสัมประสิทธิ์คาร์บอน (EF)', path: '/settings/emission-factors', icon: <Settings2 size={18} className="text-emerald-400" />, show: payload?.roles.includes('SuperAdmin') ?? false }
  ];

  const orgItems = [
    { label: 'จัดการองค์กร', path: '/organizations', icon: <Building2 size={18} className="text-blue-400" />, show: hasPermission('organizations:read') },
    { label: 'จัดการหน่วยงาน', path: '/departments', icon: <Layers size={18} className="text-cyan-400" />, show: hasPermission('departments:read') }
  ];

  const carbonItems = [
    { label: 'บันทึกข้อมูลคาร์บอน', path: '/carbon', icon: <DatabaseZap size={18} className="text-emerald-400" />, show: hasPermission('carbon-records:read') }
  ];

  const showAdminMenu = adminItems.some((item) => item.show);
  const showOrgMenu = orgItems.some((item) => item.show);
  const showCarbonMenu = carbonItems.some((item) => item.show);

  const renderNavGroup = (
    label: string,
    icon: React.ReactNode,
    items: any[],
    isOpen: boolean,
    onToggle: () => void,
    onItemClick?: () => void
  ) => (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && (
        <div className="pl-4 space-y-1 border-l border-slate-700/50 ml-6">
          {items.filter((item) => item.show).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${isActive
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'hover:bg-slate-800/60 text-slate-400 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-50 text-slate-800 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-350 border-r border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-800">
          <img src="/favicon.svg" alt="Logo" className="h-5 w-5" />
          <span className="font-bold text-lg text-white tracking-wide">ระบบข้อมูลคาร์บอน</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-emerald-600/90 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={18} className="text-sky-400" />
            แดชบอร์ด
          </NavLink>

          {/* Carbon Data Group */}
          {showCarbonMenu && renderNavGroup(
            'ข้อมูลคาร์บอน',
            <Leaf size={18} className="text-emerald-400" />,
            carbonItems,
            isCarbonOpen,
            () => setIsCarbonOpen(!isCarbonOpen)
          )}

          {/* Organization Group */}
          {showOrgMenu && renderNavGroup(
            'จัดการองค์กร',
            <Building2 size={18} className="text-blue-400" />,
            orgItems,
            isOrgOpen,
            () => setIsOrgOpen(!isOrgOpen)
          )}

          {/* Admin Group */}
          {showAdminMenu && renderNavGroup(
            'จัดการระบบ (Admin)',
            <Shield size={18} className="text-emerald-500" />,
            adminItems,
            isAdminOpen,
            () => setIsAdminOpen(!isAdminOpen)
          )}



          {/* Account Settings */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-emerald-600/90 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <User size={18} className="text-violet-400" />
            ตั้งค่าบัญชี
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{payload?.roles.join(', ')}</p>
              {user?.department && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5" title={`${user.department.organization?.name || ''} / ${user.department.name}`}>
                  {user.department.organization?.name || ''} - {user.department.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/10"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="glass-navbar sticky top-0 z-40 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-800 text-base md:text-lg leading-tight">แผงควบคุมหลัก</h1>
              {user?.department && (
                <span className="text-[11px] md:text-xs text-slate-500 font-medium block leading-normal">
                  {user.department.organization?.name} • {user.department.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-slate-400 block">ลงชื่อเข้าใช้งานในฐานะ</span>
              <span className="text-sm font-bold text-slate-700">{user?.name}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-sm shadow-inner">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile menu drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className="relative flex flex-col w-64 bg-slate-900 text-slate-330 border-r border-slate-800">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Leaf className="text-emerald-500 fill-emerald-500/20" size={24} />
                  <span className="font-bold text-lg text-white">คาร์บอนฟุตพริ้นท์</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                <NavLink
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-emerald-600/90 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard size={18} className="text-sky-400" />
                  แดชบอร์ด
                </NavLink>

                {showOrgMenu && renderNavGroup(
                  'จัดการองค์กร',
                  <Building2 size={18} className="text-blue-400" />,
                  orgItems,
                  isMobileOrgOpen,
                  () => setIsMobileOrgOpen(!isMobileOrgOpen),
                  () => setIsMobileMenuOpen(false)
                )}

                {showCarbonMenu && renderNavGroup(
                  'ข้อมูลคาร์บอน',
                  <Leaf size={18} className="text-emerald-400" />,
                  carbonItems,
                  isMobileCarbonOpen,
                  () => setIsMobileCarbonOpen(!isMobileCarbonOpen),
                  () => setIsMobileMenuOpen(false)
                )}

                {showAdminMenu && renderNavGroup(
                  'จัดการระบบ (Admin)',
                  <Shield size={18} className="text-emerald-500" />,
                  adminItems,
                  isMobileAdminOpen,
                  () => setIsMobileAdminOpen(!isMobileAdminOpen),
                  () => setIsMobileMenuOpen(false)
                )}



                <NavLink
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-emerald-600/90 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <User size={18} className="text-violet-400" />
                  ตั้งค่าบัญชี
                </NavLink>
              </nav>

              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/10"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-h-0 px-6 pt-6 md:px-8 bg-slate-100/60 overflow-y-auto">
          <Breadcrumbs />
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
            {/* Spacer to guarantee gap before footer */}
            <div className="h-10 shrink-0" />
          </div>
        </main>

        {/* Footer — fixed at bottom of content column */}
        <footer className="shrink-0 px-6 md:px-8 py-3 bg-white border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Leaf size={12} className="text-emerald-500 fill-emerald-500/20" />
              <span className="font-semibold text-slate-500">ระบบข้อมูลคาร์บอนฟุตพริ้นท์</span>
              <span className="text-slate-300">•</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Capnit</span>
              <span className="text-slate-300">|</span>
              <span>© {new Date().getFullYear()} สงวนลิขสิทธิ์</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
export default DashboardLayout;
