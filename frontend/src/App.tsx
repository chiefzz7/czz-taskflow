import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { Loader2 } from 'lucide-react';

// Lightweight loading placeholder for lazy routes
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
      <span className="text-xs font-medium text-gray-500">Carregando...</span>
    </div>
  );
}

// Public Auth Pages (loaded on demand)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Protected Feature Pages (code-split for blazing performance)
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const TasksPage = lazy(() => import('./features/tasks/TasksPage'));
const KanbanPage = lazy(() => import('./features/tasks/KanbanPage'));
const CalendarPage = lazy(() => import('./features/tasks/CalendarPage'));
const SocialMediaPage = lazy(() => import('./features/social/SocialMediaPage'));
const EnterprisePage = lazy(() => import('./features/enterprise/EnterprisePage'));
const MembersPage = lazy(() => import('./features/enterprise/MembersPage'));
const ChatPage = lazy(() => import('./features/chat/ChatPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const ProfilePage = lazy(() => import('./features/auth/ProfilePage'));
const SettingsPage = lazy(() => import('./features/auth/SettingsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="tasks" element={<TasksPage />} />
                            <Route path="kanban" element={<KanbanPage />} />
                            <Route path="social" element={<SocialMediaPage />} />
                            <Route path="calendar" element={<CalendarPage />} />
                            <Route path="enterprise" element={<EnterprisePage />} />
                            <Route path="members" element={<MembersPage />} />
                            <Route path="chat" element={<ChatPage />} />
                            <Route path="reports" element={<ReportsPage />} />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </Suspense>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
