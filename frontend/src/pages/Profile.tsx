import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authStore } from '@/store/authStore';
import { themeStore } from '@/store/themeStore';
import MainLayout from '@/components/layout/MainLayout';
import TeacherLayout from '@/components/layout/TeacherLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EditProfileModal from '@/components/profile/EditProfileModal';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Moon,
  Sun,
  LogOut,
  Settings,
  UserCircle
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const { theme, toggleTheme } = themeStore();
  const [showEditModal, setShowEditModal] = useState(false);

  // Determine which layout to use based on user role
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const Layout = isTeacher ? TeacherLayout : MainLayout;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('已退出登录');
  };

  const getRoleBadge = (role: string) => {
    const roleMap = {
      student: { label: '学生', variant: 'info' as const },
      teacher: { label: '教师', variant: 'success' as const },
      counselor: { label: '咨询师', variant: 'warning' as const },
      admin: { label: '管理员', variant: 'danger' as const },
    };
    return roleMap[role as keyof typeof roleMap] || roleMap.student;
  };

  const roleBadge = getRoleBadge(user?.role || 'student');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <UserCircle className="text-primary-600 dark:text-primary-400" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              个人中心
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            管理您的账号信息和偏好设置
          </p>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="gradient" className="mb-6 border-2 border-primary-200 dark:border-primary-800">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 shadow-glow flex items-center justify-center text-white text-3xl font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.full_name || user?.username || '未设置'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    @{user?.username || '未设置'}
                  </p>
                </div>
              </div>
              <Badge variant={roleBadge.variant} pulse>{roleBadge.label}</Badge>
            </div>

            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-3 text-gray-700 dark:text-gray-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Mail className="text-primary-500" size={20} />
                <span>{user?.email}</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 text-gray-700 dark:text-gray-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Calendar className="text-secondary-500" size={20} />
                <span>注册于 {new Date(user?.created_at || '').toLocaleDateString()}</span>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings size={24} className="text-primary-600 dark:text-primary-400" />
              偏好设置
            </h3>

            <div className="space-y-4">
              {/* Theme Toggle */}
              <motion.div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-lg border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800 transition-all"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {theme === 'dark' ? (
                      <Moon className="text-primary-600 dark:text-primary-400" size={24} />
                    ) : (
                      <Sun className="text-primary-600 dark:text-primary-400" size={24} />
                    )}
                  </motion.div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      深色模式
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {theme === 'dark' ? '已启用' : '已禁用'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="gradient-primary"
                  size="sm"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? '切换到浅色' : '切换到深色'}
                </Button>
              </motion.div>

              {/* Data Privacy */}
              <motion.div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border-2 border-green-200 dark:border-green-800"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-3">
                  <Shield className="text-green-600 dark:text-green-400" size={24} />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      数据隐私
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      您的测评数据受到保护
                    </div>
                  </div>
                </div>
                <Badge variant="success" pulse dot>安全</Badge>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              账号操作
            </h3>

            <div className="space-y-3">
              <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowEditModal(true)}
                  iconLeft={<User size={20} />}
                >
                  编辑个人资料
                </Button>
              </motion.div>

              <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast('功能开发中...', { icon: 'ℹ️' })}
                  iconLeft={<Shield size={20} />}
                >
                  修改密码
                </Button>
              </motion.div>

              <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="danger"
                  className="w-full justify-start"
                  onClick={handleLogout}
                  iconLeft={<LogOut size={20} />}
                >
                  退出登录
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </Layout>
  );
}
