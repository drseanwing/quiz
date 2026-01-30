/**
 * @file        Main App component
 * @description Root application component with routing
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { QuestionBankListPage } from '@/pages/questionBanks/QuestionBankListPage';
import { QuestionBankEditorPage } from '@/pages/questionBanks/QuestionBankEditorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserRole } from '@/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public auth routes (no layout) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes (with layout) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/question-banks"
              element={
                <ProtectedRoute requiredRoles={[UserRole.EDITOR, UserRole.ADMIN]}>
                  <Layout>
                    <QuestionBankListPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks/new"
              element={
                <ProtectedRoute requiredRoles={[UserRole.EDITOR, UserRole.ADMIN]}>
                  <Layout>
                    <QuestionBankEditorPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks/:id"
              element={
                <ProtectedRoute requiredRoles={[UserRole.EDITOR, UserRole.ADMIN]}>
                  <Layout>
                    <QuestionBankEditorPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
