import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assessmentsAPI } from '@/api/assessments';
import { authStore } from '@/store/authStore';
import FloatingNav from '@/components/layout/FloatingNav';
import FilterTabs from '@/components/shared/FilterTabs';
import AssessmentListItem from '@/components/history/AssessmentListItem';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Assessment } from '@/types/assessment';
import { Rocket, ClipboardList, Sparkles, TrendingUp, PenLine, CheckCircle2, BarChart3 } from 'lucide-react';

type FilterKey = 'all' | 'completed' | 'in_progress' | 'abandoned';

// Stable ID counter for SVG gradients
let ringIdCounter = 0;

// Mini stat ring for history hero (optimized)
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
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  // Stable gradient ID - use counter instead of random (avoids re-render issues)
  const gradientId = useMemo(() => {
    ringIdCounter++;
    return `history-ring-${color}-${ringIdCounter}`;
  }, [color]);

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        if (!isMounted) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * percentage);

        if (progress < 1 && isMounted) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      if (isMounted) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }, delay * 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
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
          <span className="text-xl font-bold text-white">{displayValue}</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-white/70">{label}</span>
    </div>
  );
};

// Numeric stat display (optimized)
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
    let isMounted = true;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      setIsVisible(true);
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        if (!isMounted) return;

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(eased * value);

        if (progress < 1 && isMounted) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      if (isMounted) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }, delay * 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, delay]);

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div
        className="relative w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center overflow-hidden"
        style={{ boxShadow: `0 8px 32px ${config.glow}` }}
      >
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.iconBg} flex items-center justify-center mb-1 shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="text-xl font-bold text-white">{Math.round(animatedValue)}</div>
      </div>
      <span className="mt-2 text-xs font-medium text-white/70">{label}</span>
    </div>
  );
};

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

export default function History() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const initialized = authStore((state) => state.initialized);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const userId = authStore((state) => state.user?.id);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assessmentsAPI.list({ limit: 100 });
      if (res.success) {
        setAssessments(res.data.items);
        setHasLoaded(true);
      } else {
        toast.error('获取历史记录失败');
      }
    } catch {
      toast.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      setHasLoaded(false);
      setAssessments([]);
    }
  }, [userId]);

  useEffect(() => {
    if (initialized && isAuthenticated && userId && !hasLoaded) {
      loadAssessments();
    }
  }, [initialized, isAuthenticated, userId, hasLoaded, loadAssessments]);

  // Calculate stats in single pass (O(n) instead of O(3n))
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let abandoned = 0;

    for (let i = 0; i < assessments.length; i++) {
      const status = assessments[i].status;
      if (status === 'completed') completed++;
      else if (status === 'in_progress') inProgress++;
      else if (status === 'abandoned') abandoned++;
    }

    return { total: assessments.length, completed, inProgress, abandoned };
  }, [assessments]);

  const completionRate = useMemo(() => {
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  }, [stats]);

  // Filter tabs configuration
  const filterTabs = useMemo(() => [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'completed', label: '已完成', count: stats.completed },
    { key: 'in_progress', label: '进行中', count: stats.inProgress },
    { key: 'abandoned', label: '已放弃', count: stats.abandoned },
  ], [stats]);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    if (activeFilter === 'all') return assessments;
    return assessments.filter(a => a.status === activeFilter);
  }, [assessments, activeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Floating Navigation */}
      <FloatingNav transparentOnTop={true} />

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16">
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
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Icon */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl blur-lg opacity-50" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 p-[2px] shadow-2xl">
                  <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                我的测评旅程
              </h1>
              <p className="text-white/70 text-sm md:text-base max-w-md mb-8">
                回顾你的心灵探索历程，见证每一次成长
              </p>

              {/* Stats */}
              <motion.div
                className="flex flex-wrap items-end justify-center gap-6 md:gap-10"
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

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Filter Tabs */}
        <div className="mb-8">
          <FilterTabs
            tabs={filterTabs}
            activeTab={activeFilter}
            onChange={(key) => setActiveFilter(key as FilterKey)}
          />
        </div>

        {/* Assessment List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
              <ClipboardList className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-center font-medium">
              {activeFilter === 'all' ? '还没有测评记录' : `暂无${filterTabs.find(t => t.key === activeFilter)?.label}的测评`}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-6">
              开始你的第一次心灵探索吧
            </p>
            <Link to="/scales">
              <Button variant="gradient-primary" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                开始测评
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                共 <span className="font-semibold text-primary-600 dark:text-primary-400">{filteredAssessments.length}</span> 条记录
              </span>
            </div>

            {/* List */}
            <div className="space-y-4 pb-8">
              {filteredAssessments.map((assessment, index) => (
                <AssessmentListItem
                  key={assessment.id}
                  assessment={assessment}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
