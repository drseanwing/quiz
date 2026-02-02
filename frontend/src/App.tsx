/**
 * @file        Main App component
 * @description Root application component with routing and error boundary
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Spinner } from '@/components/common/Spinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { UserRole } from '@/types';

// Auth pages (small, loaded eagerly for fast initial render)
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Lazy-loaded pages (code splitting for larger page bundles)
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const QuestionBankListPage = lazy(() => import('@/pages/questionBanks/QuestionBankListPage').then(m => ({ default: m.QuestionBankListPage })));
const QuestionBankEditorPage = lazy(() => import('@/pages/questionBanks/QuestionBankEditorPage').then(m => ({ default: m.QuestionBankEditorPage })));
const QuizListPage = lazy(() => import('@/pages/quiz/QuizListPage').then(m => ({ default: m.QuizListPage })));
const QuizPlayerPage = lazy(() => import('@/pages/quiz/QuizPlayerPage').then(m => ({ default: m.QuizPlayerPage })));
const QuizResultsPage = lazy(() => import('@/pages/quiz/QuizResultsPage').then(m => ({ default: m.QuizResultsPage })));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Router>
            <Suspense fallback={<PageLoader />}>
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
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ProfilePage />
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

                {/* Quiz routes (all authenticated users) */}
                <Route
                  path="/quizzes"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <QuizListPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quiz/:attemptId"
                  element={
                    <ProtectedRoute>
                      <QuizPlayerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results/:attemptId"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <QuizResultsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes (admin only) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                      <Layout>
                        <AdminPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
