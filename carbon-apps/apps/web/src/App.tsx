import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/auth-context.js';
import { ToastProvider } from './contexts/toast-context.js';
import { PublicRoute } from './components/public-route.js';
import { ProtectedRoute } from './components/protected-route.js';
import { DashboardLayout } from './layouts/dashboard-layout.js';

// Pages
import { Login } from './pages/login.js';
import { Dashboard } from './pages/dashboard.js';
import { UserList } from './pages/users/list.js';
import { RoleList } from './pages/roles/list.js';
import { PermissionList } from './pages/permissions/list.js';
import { Profile } from './pages/profile.js';
import { OrganizationList } from './pages/organizations/list.js';
import { DepartmentList } from './pages/departments/list.js';
import { CarbonRecordList } from './pages/carbon/list.js';
import { CarbonRecordForm } from './pages/carbon/form.js';
import { EmissionFactorList } from './pages/emission/list.js';
import { EmissionFactorForm } from './pages/emission/form.js';


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
            <Routes>
              {/* Public Only Routes */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
              </Route>

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
                  <Route path="/settings/emission-factors" element={<EmissionFactorList />} />
                  <Route path="/settings/emission-factors/create" element={<EmissionFactorForm />} />
                  <Route path="/settings/emission-factors/edit/:id" element={<EmissionFactorForm />} />

                  <Route path="/settings" element={<Navigate to="/profile" replace />} />
                </Route>
              </Route>


              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};
export default App;
