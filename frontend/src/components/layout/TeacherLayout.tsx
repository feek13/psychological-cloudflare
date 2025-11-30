import { ReactNode, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { themeStore } from '@/store/themeStore';
import toast from 'react-hot-toast';
import { Database } from 'lucide-react';
import {
  ChartIcon,
  EditDocumentIcon,
  MegaphoneIcon,
  UsersIcon,
  TeacherIcon,
} from '@/components/icons/DashboardIcons';

interface TeacherLayoutProps {
  children: ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = authStore();
  const { isDark, toggleTheme } = themeStore();

  // Check if user is teacher or admin
  useEffect(() => {
    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('您没有权限访问教师端');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('已退出登录');
  };

  const navItems = [
    {
      path: '/teacher/dashboard',
      label: '仪表盘',
      icon: ChartIcon
    },
    {
      path: '/teacher/scales',
      label: '量表管理',
      icon: EditDocumentIcon
    },
    {
      path: '/teacher/item-bank',
      label: '题库管理',
      icon: Database
    },
    {
      path: '/teacher/publications',
      label: '发布管理',
      icon: MegaphoneIcon
    },
    {
      path: '/teacher/students',
      label: '学生数据',
      icon: UsersIcon
    },
  ];

  if (user?.role === 'admin') {
    navItems.push({
      path: '/teacher/manage',
      label: '教师管理',
      icon: TeacherIcon
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                心理健康评估平台 - 教师端
              </h1>
              <nav className="hidden md:flex space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location.pathname === item.path
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="mr-1.5" size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <Link
                to="/profile"
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {user?.full_name || user?.username || '个人中心'}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
