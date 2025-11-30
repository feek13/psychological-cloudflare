import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authStore } from '@/store/authStore';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// 认证页面 - 独立 chunk
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));

// 学生核心页面
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Scales = lazy(() => import('@/pages/Scales'));
const ScaleDetail = lazy(() => import('@/pages/ScaleDetail'));
const Assessment = lazy(() => import('@/pages/Assessment'));

// 学生次要页面
const Report = lazy(() => import('@/pages/Report'));
const History = lazy(() => import('@/pages/History'));
const Profile = lazy(() => import('@/pages/Profile'));

// 教师页面
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const TeacherScales = lazy(() => import('@/pages/teacher/TeacherScales'));
const TeacherPublications = lazy(() => import('@/pages/teacher/TeacherPublications'));
const TeacherStudents = lazy(() => import('@/pages/teacher/TeacherStudents'));
const TeacherStudentDetail = lazy(() => import('@/pages/teacher/TeacherStudentDetail'));
const TeacherManage = lazy(() => import('@/pages/teacher/TeacherManage'));
const ItemBank = lazy(() => import('@/pages/teacher/ItemBank'));

// 工具组件
const RoleBasedRedirect = lazy(() => import('@/components/RoleBasedRedirect'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function TeacherProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = authStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user && user.role !== 'teacher' && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ConfirmProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Toaster position="top-right" />
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scales"
          element={
            <ProtectedRoute>
              <Scales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scales/:id"
          element={
            <ProtectedRoute>
              <ScaleDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/:id"
          element={
            <ProtectedRoute>
              <Assessment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <TeacherProtectedRoute>
              <TeacherDashboard />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/scales"
          element={
            <TeacherProtectedRoute>
              <TeacherScales />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/publications"
          element={
            <TeacherProtectedRoute>
              <TeacherPublications />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <TeacherProtectedRoute>
              <TeacherStudents />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/students/:id"
          element={
            <TeacherProtectedRoute>
              <TeacherStudentDetail />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/manage"
          element={
            <TeacherProtectedRoute>
              <TeacherManage />
            </TeacherProtectedRoute>
          }
        />
        <Route
          path="/teacher/item-bank"
          element={
            <TeacherProtectedRoute>
              <ItemBank />
            </TeacherProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }
        />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfirmProvider>
  );
}

export default App;
