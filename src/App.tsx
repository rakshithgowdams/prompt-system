import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectFilesPage } from './pages/ProjectFilesPage';
import { NewPromptPage } from './pages/NewPromptPage';
import { PromptDetailPage } from './pages/PromptDetailPage';
import { EditPromptPage } from './pages/EditPromptPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodoPage } from './pages/TodoPage';
import { NotionPageEditor } from './pages/NotionPageEditor';
import { SharePage } from './pages/SharePage';
import { PasswordVaultPage } from './pages/PasswordVaultPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Public share page — no auth required */}
            <Route path="/share/:shareId" element={<SharePage />} />

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
            </Route>
          </Routes>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#f9fafb',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
