import { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authStore } from '@/store/authStore';
import { themeStore } from '@/store/themeStore';
import { assessmentsAPI } from '@/api/assessments';
import FloatingNav from '@/components/layout/FloatingNav';
import ProfileHeroCard from '@/components/profile/ProfileHeroCard';
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
  Heart,
  Zap,
  Bell,
  Palette
} from 'lucide-react';

// Glass card wrapper component
const GlassCard = memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative p-6 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.08] shadow-lg overflow-hidden ${className}`}>
    {children}
  </div>
));

GlassCard.displayName = 'GlassCard';

// Action button component
const ActionButton = memo(({
  onClick,
  icon: Icon,
  label,
  gradient,
  hoverGradient,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  gradient: string;
  hoverGradient: string;
}) => (
  <button
    onClick={onClick}
    className={`group flex flex-col items-center gap-3 p-5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.08] transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg hover:bg-white dark:hover:bg-white/[0.08]`}
  >
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} ${hoverGradient} flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
      {label}
    </span>
  </button>
));

ActionButton.displayName = 'ActionButton';

// Setting row component
const SettingRow = memo(({
  icon: Icon,
  title,
  description,
  action,
  gradient,
  bgGradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: React.ReactNode;
  gradient: string;
  bgGradient: string;
}) => (
  <div className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${bgGradient} transition-all duration-300 hover:scale-[1.01] hover:translate-x-1`}>
    <div className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
    {action}
  </div>
));

SettingRow.displayName = 'SettingRow';

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
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Reset stats when user changes
  useEffect(() => {
    if (user?.id) {
      setStatsLoaded(false);
      setStats({ completed: 0, inProgress: 0, total: 0 });
      setLoading(true);
    }
  }, [user?.id]);

  // Fetch assessment stats
  useEffect(() => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Floating Navigation */}
      <FloatingNav transparentOnTop={true} />

      {/* Hero Card with Profile */}
      <ProfileHeroCard user={user} stats={stats} />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <GlassCard>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-secondary-400 to-pink-500 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              快速操作
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <ActionButton
                onClick={handleEditProfile}
                icon={Edit3}
                label="编辑资料"
                gradient="from-primary-400 to-primary-600"
                hoverGradient="group-hover:from-primary-500 group-hover:to-primary-700"
              />
              <ActionButton
                onClick={handleChangePassword}
                icon={Key}
                label="修改密码"
                gradient="from-amber-400 to-orange-500"
                hoverGradient="group-hover:from-amber-500 group-hover:to-orange-600"
              />
              <ActionButton
                onClick={handleLogout}
                icon={LogOut}
                label="退出登录"
                gradient="from-red-400 to-rose-500"
                hoverGradient="group-hover:from-red-500 group-hover:to-rose-600"
              />
            </div>
          </GlassCard>
        </motion.div>

        {/* Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          <GlassCard>
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200/20 to-secondary-200/20 dark:from-primary-900/10 dark:to-secondary-900/10 rounded-full -mr-16 -mt-16 blur-2xl" />

            <div className="relative">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-white" />
                </div>
                偏好设置
              </h3>

              <div className="space-y-4">
                {/* Theme Toggle */}
                <SettingRow
                  icon={theme === 'dark' ? Moon : Sun}
                  title="深色模式"
                  description={theme === 'dark' ? '已启用 - 护眼模式' : '已禁用 - 明亮模式'}
                  gradient="from-indigo-400 to-purple-500"
                  bgGradient="from-indigo-50/80 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10"
                  action={
                    <button
                      onClick={toggleTheme}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                        theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                        style={{ left: theme === 'dark' ? '30px' : '4px' }}
                      />
                    </button>
                  }
                />

                {/* Security Status */}
                <SettingRow
                  icon={Shield}
                  title="数据隐私保护"
                  description="您的测评数据已加密存储"
                  gradient="from-emerald-400 to-green-500"
                  bgGradient="from-emerald-50/80 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/10"
                  action={
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">安全</span>
                    </div>
                  }
                />

                {/* Notifications (placeholder) */}
                <SettingRow
                  icon={Bell}
                  title="通知提醒"
                  description="接收测评提醒和结果通知"
                  gradient="from-amber-400 to-orange-500"
                  bgGradient="from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10"
                  action={
                    <button
                      className="relative w-14 h-7 rounded-full bg-primary-500 transition-colors duration-300"
                      onClick={() => toast('功能开发中...', { icon: 'ℹ️' })}
                    >
                      <div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                        style={{ left: '30px' }}
                      />
                    </button>
                  }
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Footer Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-white/[0.08]">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              心理健康，从了解自己开始
            </span>
          </div>
        </motion.div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
