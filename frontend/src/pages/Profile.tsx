import { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { themeStore } from '@/store/themeStore';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import TeacherLayout from '@/components/layout/TeacherLayout';
import Card from '@/components/ui/Card';
import AnimatedBlobs from '@/components/ui/AnimatedBlobs';
import ProfileCard3D from '@/components/profile/ProfileCard3D';
import { StatsCard } from '@/components/profile/StatsRing';
import EditProfileModal from '@/components/profile/EditProfileModal';
import toast from 'react-hot-toast';
import {
  Moon,
  Sun,
  LogOut,
  Settings,
  Shield,
  Edit3,
  Key,
  Sparkles,
  Heart,
  Zap
} from 'lucide-react';

// Memoized action button component
const ActionButton = memo(({
  onClick,
  icon: Icon,
  label,
  gradient,
  bgGradient,
  border,
  shadowColor,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  gradient: string;
  bgGradient: string;
  border: string;
  shadowColor: string;
}) => (
  <button
    className={`flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br ${bgGradient} border ${border} group transition-all duration-200 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98]`}
    onClick={onClick}
  >
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadowColor} group-hover:shadow-xl transition-shadow`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </span>
  </button>
));

ActionButton.displayName = 'ActionButton';

export default function Profile() {
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const initialized = authStore((s) => s.initialized);
  const isAuthenticated = authStore((s) => s.isAuthenticated);
  const { theme, toggleTheme } = themeStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({ completed: 0, inProgress: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Determine which layout to use based on user role
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const Layout = isTeacher ? TeacherLayout : MainLayout;

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Reset stats when user changes (account switch)
  useEffect(() => {
    if (user?.id) {
      setStatsLoaded(false);
      setStats({ completed: 0, inProgress: 0, total: 0 });
      setLoading(true);
    }
  }, [user?.id]);

  // Fetch assessment stats (only when auth is ready)
  useEffect(() => {
    // Guard: wait for auth to be initialized and user to be authenticated
    if (!initialized || !isAuthenticated || !user?.id || statsLoaded) {
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await assessmentsAPI.list({ limit: 100 });
        if (response.success && response.data) {
          const items = response.data.items || [];
          const completed = items.filter((a: any) => a.status === 'completed').length;
          const inProgress = items.filter((a: any) => a.status === 'in_progress').length;
          setStats({ completed, inProgress, total: completed + inProgress });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
        setStatsLoaded(true);
      }
    };

    fetchStats();
  }, [initialized, isAuthenticated, user?.id, statsLoaded]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    toast.success('已退出登录');
  }, [logout, navigate]);

  const handleEditProfile = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleChangePassword = useCallback(() => {
    toast('功能开发中...', { icon: 'ℹ️' });
  }, []);

  return (
    <Layout>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-primary-50/30 to-secondary-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" />
        <AnimatedBlobs variant="profile" />
      </div>

      <div
        className={`max-w-6xl mx-auto px-4 py-6 space-y-8 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Header with Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 mb-4">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">个人中心</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-slow">
            欢迎回来
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            管理您的账号信息和偏好设置
          </p>
        </div>

        {/* Profile Card 3D */}
        <ProfileCard3D user={user} />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Card - Left Side */}
          <div className="lg:col-span-5">
            {!loading && <StatsCard stats={stats} />}
          </div>

          {/* Settings & Actions - Right Side */}
          <div className="lg:col-span-7 space-y-6">
            {/* Preferences Card */}
            <Card
              variant="glass"
              hover={false}
              className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
            >
              {/* Decorative Gradient - static */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-200/20 to-secondary-200/20 dark:from-primary-900/15 dark:to-secondary-900/15 rounded-full -mr-20 -mt-20 blur-2xl" />

              <div className="relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-500" />
                  偏好设置
                </h3>

                <div className="space-y-4">
                  {/* Theme Toggle */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/30 border border-gray-200/50 dark:border-gray-600/30 transition-transform duration-200 hover:scale-[1.01] hover:translate-x-1"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-400/30 transition-transform duration-300"
                        style={{ transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)' }}
                      >
                        {theme === 'dark' ? (
                          <Moon className="w-6 h-6 text-white" />
                        ) : (
                          <Sun className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          深色模式
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {theme === 'dark' ? '已启用 - 护眼模式' : '已禁用 - 明亮模式'}
                        </div>
                      </div>
                    </div>
                    <button
                      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                        theme === 'dark'
                          ? 'bg-primary-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      onClick={toggleTheme}
                    >
                      <div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                        style={{ left: theme === 'dark' ? '30px' : '4px' }}
                      />
                    </button>
                  </div>

                  {/* Data Privacy */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200/50 dark:border-green-700/30 transition-transform duration-200 hover:scale-[1.01] hover:translate-x-1"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-400/30">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          数据隐私保护
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          您的测评数据已加密存储
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        安全
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card
              variant="glass"
              hover={false}
              className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-secondary-200/20 to-primary-200/20 dark:from-secondary-900/15 dark:to-primary-900/15 rounded-full -ml-16 -mb-16 blur-xl" />

              <div className="relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary-500" />
                  快速操作
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ActionButton
                    onClick={handleEditProfile}
                    icon={Edit3}
                    label="编辑资料"
                    gradient="from-primary-400 to-primary-600"
                    bgGradient="from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10"
                    border="border-primary-200/50 dark:border-primary-700/30"
                    shadowColor="shadow-primary-400/30"
                  />
                  <ActionButton
                    onClick={handleChangePassword}
                    icon={Key}
                    label="修改密码"
                    gradient="from-amber-400 to-amber-600"
                    bgGradient="from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10"
                    border="border-amber-200/50 dark:border-amber-700/30"
                    shadowColor="shadow-amber-400/30"
                  />
                  <ActionButton
                    onClick={handleLogout}
                    icon={LogOut}
                    label="退出登录"
                    gradient="from-red-400 to-rose-500"
                    bgGradient="from-red-50 to-rose-100/50 dark:from-red-900/20 dark:to-rose-800/10"
                    border="border-red-200/50 dark:border-red-700/30"
                    shadowColor="shadow-red-400/30"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 transition-transform duration-200 hover:scale-[1.02]">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              心理健康，从了解自己开始
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      {/* Global Styles */}
      <style>{`
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 4s ease infinite;
        }
      `}</style>
    </Layout>
  );
}
