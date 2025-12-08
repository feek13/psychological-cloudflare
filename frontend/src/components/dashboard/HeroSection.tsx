import { memo, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PenLine, ClipboardList } from 'lucide-react';
import type { User } from '@/types/auth';

interface HeroSectionProps {
  user: User | null;
  stats: {
    completed: number;
    inProgress: number;
    total: number;
  };
  avgScore: number | null;
  isLoading?: boolean;
  className?: string;
}

// CSS-based organic blob (optimized, no framer-motion)
const CSSBlob = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 200 200" className={className} style={style}>
    <path
      fill="currentColor"
      d="M45.7,-62.2C58.9,-54.3,68.9,-40.7,74.3,-25.4C79.7,-10.1,80.5,6.9,75.4,21.8C70.3,36.7,59.3,49.4,45.8,58.5C32.3,67.6,16.2,73,-0.8,74.1C-17.8,75.2,-35.6,72,-49.4,62.7C-63.2,53.4,-73,38,-77.3,21.3C-81.6,4.6,-80.4,-13.4,-73.1,-28.3C-65.8,-43.2,-52.4,-55,-37.8,-62.4C-23.2,-69.8,-7.4,-72.8,6.5,-81.4C20.4,-90,32.5,-70.1,45.7,-62.2Z"
      transform="translate(100 100)"
    />
  </svg>
);

// Mini stat ring component (smaller version for hero)
const MiniStatRing = memo(({
  value,
  maxValue,
  label,
  color,
  delay = 0,
}: {
  value: number;
  maxValue: number;
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  delay?: number;
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  const colorMap = {
    primary: { gradient: ['#14b8a6', '#0d9488'], glow: 'rgba(20, 184, 166, 0.4)' },
    secondary: { gradient: ['#a855f7', '#9333ea'], glow: 'rgba(168, 85, 247, 0.4)' },
    success: { gradient: ['#22c55e', '#16a34a'], glow: 'rgba(34, 197, 94, 0.4)' },
    warning: { gradient: ['#f59e0b', '#d97706'], glow: 'rgba(245, 158, 11, 0.4)' },
  };

  const colors = colorMap[color];
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  // Stable gradient ID - memoized to prevent re-renders
  const gradientId = useMemo(
    () => `hero-ring-${color}-${Math.random().toString(36).slice(2, 6)}`,
    [color]
  );

  useEffect(() => {
    let rafId: number | null = null;

    const timer = setTimeout(() => {
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * percentage);

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
        }
      };

      rafId = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [percentage, delay]);

  const displayValue = Math.round((animatedValue / 100) * maxValue);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow */}
        <div
          className="absolute inset-1 rounded-full blur-md transition-opacity duration-500"
          style={{ backgroundColor: colors.glow, opacity: animatedValue > 0 ? 0.5 : 0 }}
        />

        {/* Background ring */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10 dark:text-white/10"
          />
        </svg>

        {/* Progress ring */}
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

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white dark:text-white">
            {displayValue}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-white/70 dark:text-white/70">
        {label}
      </span>
    </div>
  );
});

MiniStatRing.displayName = 'MiniStatRing';

// Numeric stat display with glass card design
const NumericStat = memo(({
  value,
  label,
  icon,
  color = 'amber',
  delay = 0,
}: {
  value: number;
  label: string;
  icon: ReactNode;
  color?: 'amber' | 'blue' | 'purple' | 'cyan';
  delay?: number;
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const colorConfig = {
    amber: {
      iconBg: 'from-amber-400 to-orange-500',
      glow: 'rgba(245, 158, 11, 0.3)',
    },
    blue: {
      iconBg: 'from-blue-400 to-indigo-500',
      glow: 'rgba(59, 130, 246, 0.3)',
    },
    purple: {
      iconBg: 'from-purple-400 to-pink-500',
      glow: 'rgba(168, 85, 247, 0.3)',
    },
    cyan: {
      iconBg: 'from-cyan-400 to-teal-500',
      glow: 'rgba(34, 211, 238, 0.3)',
    },
  };

  const config = colorConfig[color];

  useEffect(() => {
    let rafId: number | null = null;

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
          rafId = requestAnimationFrame(animate);
        }
      };

      rafId = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [value, delay]);

  return (
    <div
      className={`relative flex flex-col items-center transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Glass card container */}
      <div
        className="relative w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center overflow-hidden"
        style={{
          boxShadow: `0 8px 32px ${config.glow}`,
        }}
      >
        {/* Icon at top */}
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.iconBg} flex items-center justify-center mb-1 shadow-lg`}>
          {icon}
        </div>

        {/* Value */}
        <div className="text-xl font-bold text-white">
          {Math.round(animatedValue)}
        </div>
      </div>

      {/* Label */}
      <span className="mt-2 text-xs font-medium text-white/70">
        {label}
      </span>
    </div>
  );
});

NumericStat.displayName = 'NumericStat';

const HeroSection = memo(({
  user,
  stats,
  avgScore,
  isLoading = false,
  className = '',
}: HeroSectionProps) => {
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Track page visibility for animation pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const shouldAnimate = isPageVisible && !isLoading;

  // Calculate completion rate
  const completionRate = useMemo(() => {
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  }, [stats.completed, stats.total]);

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  }, []);

  return (
    <div className={`relative min-h-[45vh] overflow-hidden pt-16 ${className}`}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900/90 to-secondary-900/80 dark:from-slate-900 dark:via-primary-900/90 dark:to-secondary-900/80" />

      {/* Light mode gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 dark:opacity-0 transition-opacity duration-300" />

      {/* Animated Blobs */}
      <CSSBlob
        className={`absolute -top-20 -left-20 w-96 h-96 text-primary-500/20 dark:text-primary-400/15 blob-animate-1 ${!shouldAnimate ? 'blob-paused' : ''}`}
        style={{ filter: 'blur(40px)' }}
      />
      <CSSBlob
        className={`absolute -bottom-32 -right-20 w-[500px] h-[500px] text-secondary-500/20 dark:text-secondary-400/15 blob-animate-2 ${!shouldAnimate ? 'blob-paused' : ''}`}
        style={{ filter: 'blur(50px)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[45vh] px-4 py-12">
        {/* Avatar & Welcome */}
        <motion.div
          className="flex flex-col items-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full blur-lg opacity-50" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 p-[3px] shadow-2xl">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-300 to-secondary-400 flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white drop-shadow-lg">
                    {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {greeting}，{user?.full_name || user?.username || '同学'}
          </h1>
          <p className="text-white/70 text-sm md:text-base">
            继续你的心灵探索之旅
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="flex flex-wrap items-end justify-center gap-6 md:gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Completion Rate Ring */}
          <MiniStatRing
            value={completionRate}
            maxValue={100}
            label="完成率%"
            color="success"
            delay={0.3}
          />

          {/* In Progress Number */}
          <NumericStat
            value={stats.inProgress}
            label="进行中"
            icon={<PenLine className="w-4 h-4 text-white" />}
            color="amber"
            delay={0.4}
          />

          {/* Available Number */}
          <NumericStat
            value={stats.total}
            label="可参与"
            icon={<ClipboardList className="w-4 h-4 text-white" />}
            color="cyan"
            delay={0.5}
          />

          {/* Average Score Ring */}
          <MiniStatRing
            value={avgScore ?? 0}
            maxValue={100}
            label="平均分"
            color="primary"
            delay={0.6}
          />
        </motion.div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full h-auto block">
          <path
            fill="currentColor"
            className="text-gray-50 dark:text-gray-900"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -20px) scale(1.05) rotate(5deg); }
          66% { transform: translate(-20px, 20px) scale(0.95) rotate(-5deg); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(-40px, 30px) scale(1.08) rotate(-8deg); }
          66% { transform: translate(30px, -20px) scale(0.92) rotate(8deg); }
        }
        .blob-animate-1 {
          animation: blob-float-1 20s ease-in-out infinite;
          will-change: transform;
        }
        .blob-animate-2 {
          animation: blob-float-2 25s ease-in-out infinite;
          will-change: transform;
        }
        .blob-paused {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
