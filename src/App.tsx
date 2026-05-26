import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Skeleton } from './components/ui/Skeleton';
import { InstallPrompt } from './components/ui/InstallPrompt';

// Auth pages are small — keep them eager so login is instant
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { RefundPolicyPage } from './pages/legal/RefundPolicyPage';

// Heavy app pages — lazy loaded for fast initial bundle
const DashboardPage     = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProjectPage       = lazy(() => import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })));
const ProjectFilesPage  = lazy(() => import('./pages/ProjectFilesPage').then((m) => ({ default: m.ProjectFilesPage })));
const NewPromptPage     = lazy(() => import('./pages/NewPromptPage').then((m) => ({ default: m.NewPromptPage })));
const PromptDetailPage  = lazy(() => import('./pages/PromptDetailPage').then((m) => ({ default: m.PromptDetailPage })));
const EditPromptPage    = lazy(() => import('./pages/EditPromptPage').then((m) => ({ default: m.EditPromptPage })));
const SettingsPage      = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TodoPage          = lazy(() => import('./pages/TodoPage').then((m) => ({ default: m.TodoPage })));
const NotionPageEditor  = lazy(() => import('./pages/NotionPageEditor').then((m) => ({ default: m.NotionPageEditor })));
const SharePage         = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));
const PasswordVaultPage = lazy(() => import('./pages/PasswordVaultPage').then((m) => ({ default: m.PasswordVaultPage })));
const CoursesPage       = lazy(() => import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const CourseEditorPage  = lazy(() => import('./pages/CourseEditorPage').then((m) => ({ default: m.CourseEditorPage })));
const CoursePlayerPage  = lazy(() => import('./pages/CoursePlayerPage').then((m) => ({ default: m.CoursePlayerPage })));
const CertificatePage   = lazy(() => import('./pages/CertificatePage').then((m) => ({ default: m.CertificatePage })));
const CourseSharePage   = lazy(() => import('./pages/CourseSharePage').then((m) => ({ default: m.CourseSharePage })));
const LandingPage       = lazy(() => import('./pages/landing/LandingPage'));
const PricingPage       = lazy(() => import('./pages/landing/PricingPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

function RootGate() {
  const { user, loading } = useAuth();
  if (loading) return <PageFallback />;
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col gap-4 p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
      <Skeleton className="h-5 w-3/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<RootGate />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/refund" element={<RefundPolicyPage />} />

              {/* Public share pages — no auth required */}
              <Route path="/share/:shareId" element={<SharePage />} />
              <Route path="/courses/share/:shareId" element={<CourseSharePage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<Navigate to="/dashboard" replace />} />
                <Route path="/projects/:slug" element={<ProjectPage />} />
                <Route path="/projects/:slug/files" element={<ProjectFilesPage />} />
                <Route path="/projects/:slug/new" element={<NewPromptPage />} />
                <Route path="/projects/:slug/pages/:pageId" element={<NotionPageEditor />} />
                <Route path="/prompts/:id" element={<PromptDetailPage />} />
                <Route path="/prompts/:id/edit" element={<EditPromptPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/vault" element={<PasswordVaultPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:courseId/edit" element={<CourseEditorPage />} />
                <Route path="/courses/:courseId/learn" element={<CoursePlayerPage />} />
                <Route path="/courses/:courseId/certificate" element={<CertificatePage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>

        <InstallPrompt />

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #D1D7DC',
              color: '#1C1D1F',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
