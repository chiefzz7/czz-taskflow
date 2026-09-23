import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './features/dashboard/DashboardPage';
import TasksPage from './features/tasks/TasksPage';
import KanbanPage from './features/tasks/KanbanPage';
import CalendarPage from './features/tasks/CalendarPage';
import SocialMediaPage from './features/social/SocialMediaPage';
import EnterprisePage from './features/enterprise/EnterprisePage';
import MembersPage from './features/enterprise/MembersPage';
import ChatPage from './features/chat/ChatPage';
import ReportsPage from './features/reports/ReportsPage';
import ProfilePage from './features/auth/ProfilePage';
import SettingsPage from './features/auth/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
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
                    </AppLayout>
                  </ProtectedRoute>
                }
              />


              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
