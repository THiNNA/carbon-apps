import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/auth-context.js';
import { ToastProvider } from './contexts/toast-context.js';
import { PublicRoute } from './components/public-route.js';
import { ProtectedRoute } from './components/protected-route.js';
import { DashboardLayout } from './layouts/dashboard-layout.js';
import { LoadingSpinner } from './components/loading-spinner.js';

// ─── Lazy-loaded pages (Route-level Code Splitting) ─────────────────────────
// แยก bundle ออกเป็นไฟล์ย่อยตามหน้า — โหลดเฉพาะเมื่อ navigate ไปหน้านั้น
const Login             = lazy(() => import('./pages/login.js').then(m => ({ default: m.Login })));
const Dashboard         = lazy(() => import('./pages/dashboard.js').then(m => ({ default: m.Dashboard })));
const UserList          = lazy(() => import('./pages/users/list.js').then(m => ({ default: m.UserList })));
const RoleList          = lazy(() => import('./pages/roles/list.js').then(m => ({ default: m.RoleList })));
const PermissionList    = lazy(() => import('./pages/permissions/list.js').then(m => ({ default: m.PermissionList })));
const Profile           = lazy(() => import('./pages/profile.js').then(m => ({ default: m.Profile })));
const OrganizationList  = lazy(() => import('./pages/organizations/list.js').then(m => ({ default: m.OrganizationList })));
const DepartmentList    = lazy(() => import('./pages/departments/list.js').then(m => ({ default: m.DepartmentList })));
const CarbonRecordList  = lazy(() => import('./pages/carbon/list.js').then(m => ({ default: m.CarbonRecordList })));
const CarbonRecordForm  = lazy(() => import('./pages/carbon/form.js').then(m => ({ default: m.CarbonRecordForm })));
const EmissionFactorList = lazy(() => import('./pages/emission/list.js').then(m => ({ default: m.EmissionFactorList })));
const TransactionLogs   = lazy(() => import('./pages/settings/transaction-logs.js').then(m => ({ default: m.TransactionLogs })));
const LicenseActivation = lazy(() => import('./pages/settings/license-activation.js').then(m => ({ default: m.LicenseActivation })));


// ─── Shared page loading fallback ────────────────────────────────────────────

const PageLoader: React.FC = () => (
  <div className="flex h-screen items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Only Routes */}
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                {/* License Activation Route (Unprotected) */}
                <Route path="/license-activation" element={<LicenseActivation />} />


                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<UserList />} />
                    <Route path="/roles" element={<RoleList />} />
                    <Route path="/permissions" element={<PermissionList />} />
                    <Route path="/organizations" element={<OrganizationList />} />
                    <Route path="/departments" element={<DepartmentList />} />
                    <Route path="/carbon" element={<CarbonRecordList />} />
                    <Route path="/carbon/create" element={<CarbonRecordForm />} />
                    <Route path="/carbon/edit/:id" element={<CarbonRecordForm />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/emission-factors" element={<EmissionFactorList />} />
                    <Route path="/settings/transaction-logs" element={<TransactionLogs />} />

                    <Route path="/settings" element={<Navigate to="/profile" replace />} />
                  </Route>
                </Route>

                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};
export default App;
