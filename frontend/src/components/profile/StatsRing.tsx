import { memo, useEffect, useState, useRef } from 'react';

interface StatsRingProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  subLabel?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  delay?: number;
  className?: string;
}

const colorMap = {
  primary: {
    gradient: ['#14b8a6', '#0d9488'],
    glow: 'rgba(20, 184, 166, 0.3)',
  },
  secondary: {
    gradient: ['#a855f7', '#9333ea'],
    glow: 'rgba(168, 85, 247, 0.3)',
  },
  success: {
    gradient: ['#22c55e', '#16a34a'],
    glow: 'rgba(34, 197, 94, 0.3)',
  },
  warning: {
    gradient: ['#f59e0b', '#d97706'],
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  danger: {
    gradient: ['#ef4444', '#dc2626'],
    glow: 'rgba(239, 68, 68, 0.3)',
  },
};

const StatsRing = memo(({
  value,
  maxValue,
  size = 140,
  strokeWidth = 12,
  label,
  subLabel,
  color = 'primary',
  showPercentage = true,
  delay = 0,
  className = '',
}: StatsRingProps) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  const colors = colorMap[color];
  const gradientId = `ring-gradient-${color}-${Math.random().toString(36).slice(2, 8)}`;

  // Animate the ring using requestAnimationFrame
  useEffect(() => {
    const animationDelay = setTimeout(() => {
      setIsVisible(true);

      const duration = 800; // ms
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out-cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * percentage);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(animationDelay);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [percentage, delay]);

  const displayNumber = Math.round((animatedValue / 100) * (maxValue > 0 ? maxValue : 100));

  return (
    <div
      className={`relative flex flex-col items-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {/* Ring Container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Subtle Glow Effect */}
        <div
          className="absolute inset-2 rounded-full transition-opacity duration-500"
          style={{
            backgroundColor: colors.glow,
            filter: 'blur(12px)',
            opacity: isVisible ? 0.4 : 0,
          }}
        />

        {/* Background Ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
        </svg>

        {/* Progress Ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="will-change-[stroke-dashoffset] transition-none"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {showPercentage && maxValue > 0 ? displayNumber : Math.round(animatedValue)}
          </div>
          {showPercentage && maxValue > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              / {maxValue}
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      <div className="mt-4 text-center">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {label}
        </div>
        {subLabel && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
});

StatsRing.displayName = 'StatsRing';

// Multi-ring stats card component
interface StatsCardProps {
  stats: {
    completed: number;
    inProgress: number;
    total: number;
  };
  className?: string;
}

export const StatsCard = memo(({ stats, className = '' }: StatsCardProps) => {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 ${className}`}
    >
      {/* Background Decoration - static */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200/15 to-secondary-200/15 dark:from-primary-900/10 dark:to-secondary-900/10 rounded-full -mr-16 -mt-16 blur-xl" />

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        测评统计
      </h3>

      {/* Stats Rings */}
      <div className="flex justify-around items-end gap-4">
        <StatsRing
          value={stats.completed}
          maxValue={stats.total || 1}
          size={100}
          strokeWidth={10}
          label="已完成"
          color="success"
          delay={0.1}
        />
        <StatsRing
          value={stats.inProgress}
          maxValue={stats.total || 1}
          size={100}
          strokeWidth={10}
          label="进行中"
          color="warning"
          delay={0.2}
        />
        <StatsRing
          value={completionRate}
          maxValue={100}
          size={100}
          strokeWidth={10}
          label="完成率"
          subLabel="%"
          showPercentage={false}
          color="primary"
          delay={0.3}
        />
      </div>

      {/* Summary Text */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          共参与 <span className="font-semibold text-primary-600 dark:text-primary-400">{stats.total}</span> 项测评，
          继续保持！
        </p>
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsRing;
