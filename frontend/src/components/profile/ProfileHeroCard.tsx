import { memo, useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, GraduationCap, Hash, User, TrendingUp, BarChart3, PenLine } from 'lucide-react';
import type { User as UserType } from '@/types/auth';

interface ProfileHeroCardProps {
  user: UserType | null;
  stats: {
    completed: number;
    inProgress: number;
    total: number;
  };
  className?: string;
}

// CSS Blob
const CSSBlob = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 200 200" className={className} style={style}>
    <path
      fill="currentColor"
      d="M45.7,-62.2C58.9,-54.3,68.9,-40.7,74.3,-25.4C79.7,-10.1,80.5,6.9,75.4,21.8C70.3,36.7,59.3,49.4,45.8,58.5C32.3,67.6,16.2,73,-0.8,74.1C-17.8,75.2,-35.6,72,-49.4,62.7C-63.2,53.4,-73,38,-77.3,21.3C-81.6,4.6,-80.4,-13.4,-73.1,-28.3C-65.8,-43.2,-52.4,-55,-37.8,-62.4C-23.2,-69.8,-7.4,-72.8,6.5,-81.4C20.4,-90,32.5,-70.1,45.7,-62.2Z"
      transform="translate(100 100)"
    />
  </svg>
);

// Mini stat ring
const MiniStatRing = ({
  value,
  maxValue,
  label,
  color,
  delay = 0,
}: {
  value: number;
  maxValue: number;
  label: string;
  color: 'primary' | 'success' | 'warning';
  delay?: number;
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  const colorMap = {
    primary: { gradient: ['#14b8a6', '#0d9488'], glow: 'rgba(20, 184, 166, 0.4)' },
    success: { gradient: ['#22c55e', '#16a34a'], glow: 'rgba(34, 197, 94, 0.4)' },
    warning: { gradient: ['#f59e0b', '#d97706'], glow: 'rgba(245, 158, 11, 0.4)' },
  };

  const colors = colorMap[color];
  const size = 70;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  const gradientId = useMemo(
    () => `profile-ring-${color}-${Math.random().toString(36).slice(2, 6)}`,
    [color]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * percentage);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [percentage, delay]);

  const displayValue = Math.round((animatedValue / 100) * maxValue);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-1 rounded-full blur-md transition-opacity duration-500"
          style={{ backgroundColor: colors.glow, opacity: animatedValue > 0 ? 0.5 : 0 }}
        />
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
        </svg>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{displayValue}</span>
        </div>
      </div>
      <span className="mt-1.5 text-xs font-medium text-white/70">{label}</span>
    </div>
  );
};

// Numeric stat display
const NumericStat = ({
  value,
  label,
  icon: Icon,
  color = 'amber',
  delay = 0,
}: {
  value: number;
  label: string;
  icon: typeof TrendingUp;
  color?: 'amber' | 'cyan';
  delay?: number;
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  const colorConfig = {
    amber: { iconBg: 'from-amber-400 to-orange-500', glow: 'rgba(245, 158, 11, 0.3)' },
    cyan: { iconBg: 'from-cyan-400 to-teal-500', glow: 'rgba(34, 211, 238, 0.3)' },
  };

  const config = colorConfig[color];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * value);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, delay]);

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div
        className="relative w-[70px] h-[70px] rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center overflow-hidden"
        style={{ boxShadow: `0 8px 32px ${config.glow}` }}
      >
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${config.iconBg} flex items-center justify-center mb-0.5 shadow-lg`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="text-lg font-bold text-white">{Math.round(animatedValue)}</div>
      </div>
      <span className="mt-1.5 text-xs font-medium text-white/70">{label}</span>
    </div>
  );
};

const ProfileHeroCard = memo(({ user, stats, className = '' }: ProfileHeroCardProps) => {
  const roleBadge = useMemo(() => {
    const roleMap = {
      student: { label: '学生', icon: GraduationCap, color: 'from-blue-400 to-indigo-500' },
      teacher: { label: '教师', icon: User, color: 'from-emerald-400 to-green-500' },
      counselor: { label: '咨询师', icon: User, color: 'from-amber-400 to-orange-500' },
      admin: { label: '管理员', icon: User, color: 'from-purple-400 to-pink-500' },
    };
    return roleMap[user?.role as keyof typeof roleMap] || roleMap.student;
  }, [user?.role]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className={`relative overflow-hidden pt-16 ${className}`}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900/90 to-secondary-900/80 dark:from-slate-900 dark:via-primary-900/90 dark:to-secondary-900/80" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 dark:opacity-0 transition-opacity duration-300" />

      {/* Blobs */}
      <CSSBlob
        className="absolute -top-20 -left-20 w-72 h-72 text-primary-500/20 dark:text-primary-400/15 blob-animate-1"
        style={{ filter: 'blur(40px)' }}
      />
      <CSSBlob
        className="absolute -bottom-20 -right-20 w-80 h-80 text-secondary-500/20 dark:text-secondary-400/15 blob-animate-2"
        style={{ filter: 'blur(50px)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full blur-lg opacity-50" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 p-[3px] shadow-2xl">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-300 to-secondary-400 flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white drop-shadow-lg">
                      {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                    </span>
                  )}
                </div>
              </div>
              {/* Online Indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-primary-800 animate-pulse" />
            </div>

            {/* Name & Role */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {user?.full_name || user?.username || '未设置'}
            </h1>
            <p className="text-white/60 text-sm mb-3">@{user?.username || '未设置'}</p>

            {/* Role Badge */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${roleBadge.color} shadow-lg mb-6`}>
              <roleBadge.icon className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">{roleBadge.label}</span>
            </div>

            {/* Info Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Mail className="w-4 h-4 text-white/70" />
                <span className="text-sm text-white/80">{user?.email || '未设置邮箱'}</span>
              </div>
              {user?.student_id && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Hash className="w-4 h-4 text-white/70" />
                  <span className="text-sm text-white/80">{user.student_id}</span>
                </div>
              )}
              {user?.enrollment_year && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span className="text-sm text-white/80">{user.enrollment_year}级</span>
                </div>
              )}
              {user?.class_name && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <GraduationCap className="w-4 h-4 text-white/70" />
                  <span className="text-sm text-white/80">{user.class_name}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <motion.div
              className="flex flex-wrap items-end justify-center gap-5 md:gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <MiniStatRing
                value={completionRate}
                maxValue={100}
                label="完成率%"
                color="success"
                delay={0.3}
              />
              <NumericStat
                value={stats.inProgress}
                label="进行中"
                icon={PenLine}
                color="amber"
                delay={0.4}
              />
              <NumericStat
                value={stats.total}
                label="总测评"
                icon={BarChart3}
                color="cyan"
                delay={0.5}
              />
              <MiniStatRing
                value={stats.completed}
                maxValue={stats.total || 1}
                label="已完成"
                color="primary"
                delay={0.6}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 80" className="w-full h-auto block">
          <path
            fill="currentColor"
            className="text-gray-50 dark:text-gray-900"
            d="M0,48L60,42.7C120,37,240,27,360,32C480,37,600,59,720,64C840,69,960,59,1080,48C1200,37,1320,27,1380,21.3L1440,16L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
          />
        </svg>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(20px, -15px) scale(1.05) rotate(5deg); }
          66% { transform: translate(-15px, 15px) scale(0.95) rotate(-5deg); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(-30px, 20px) scale(1.08) rotate(-8deg); }
          66% { transform: translate(20px, -15px) scale(0.92) rotate(8deg); }
        }
        .blob-animate-1 { animation: blob-float-1 20s ease-in-out infinite; will-change: transform; }
        .blob-animate-2 { animation: blob-float-2 25s ease-in-out infinite; will-change: transform; }
      `}</style>
    </div>
  );
});

ProfileHeroCard.displayName = 'ProfileHeroCard';

export default ProfileHeroCard;
