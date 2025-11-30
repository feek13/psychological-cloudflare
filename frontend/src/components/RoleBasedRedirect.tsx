import { Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

/**
 * RoleBasedRedirect Component
 * Redirects users to the appropriate dashboard based on their role
 *
 * - Teachers, Counselors, Admins → /teacher/dashboard
 * - Students or unknown roles → /dashboard
 */
export default function RoleBasedRedirect() {
  const user = authStore((state) => state.user);

  // Check if user has a teacher/admin role
  const isTeacherOrAdmin = user && ['teacher', 'counselor', 'admin'].includes(user.role);

  // Redirect to appropriate dashboard
  if (isTeacherOrAdmin) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
