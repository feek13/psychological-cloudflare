import { memo, useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, PlayCircle, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Scale } from '@/types';

interface EnhancedScaleCardProps {
  scale: Scale;
  status?: {
    status: 'in_progress' | 'completed' | 'abandoned' | null;
    assessmentId?: string;
    progress?: number;
  };
  index?: number;
  className?: string;
}

const statusConfig = {
  in_progress: {
    badge: '进行中',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'border-amber-200 dark:border-amber-700/50',
    glowColor: 'rgba(245, 158, 11, 0.15)',
  },
  completed: {
    badge: '已完成',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    borderColor: 'border-emerald-200 dark:border-emerald-700/50',
    glowColor: 'rgba(34, 197, 94, 0.15)',
  },
  abandoned: {
    badge: '已放弃',
    icon: Clock,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/40',
    borderColor: 'border-gray-200 dark:border-gray-700/50',
    glowColor: 'rgba(156, 163, 175, 0.1)',
  },
  available: {
    badge: '可开始',
    icon: PlayCircle,
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-900/40',
    borderColor: 'border-primary-200 dark:border-primary-700/50',
    glowColor: 'rgba(20, 184, 166, 0.15)',
  },
};

const EnhancedScaleCard = memo(({
  scale,
  status,
  index = 0,
  className = '',
}: EnhancedScaleCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Determine status config
  const currentStatus = status?.status || 'available';
  const config = statusConfig[currentStatus === null ? 'available' : currentStatus] || statusConfig.available;
  const StatusIcon = config.icon;

  // 3D tilt effect - optimized with proper RAF throttling
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if RAF is already scheduled
    if (rafRef.current !== null) return;

    // Store event data before RAF (event may be pooled/recycled)
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) {
        rafRef.current = null;
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;

      // Batch state update after RAF completes
      setTransform({ rotateX: -y * 10, rotateY: x * 10 });
      rafRef.current = null;
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setTransform({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  }, []);

  // Cleanup RAF on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Generate action link and text
  const getAction = () => {
    if (currentStatus === 'completed') {
      return { link: `/reports/${status?.assessmentId}`, text: '查看报告', icon: FileText };
    }
    if (currentStatus === 'in_progress') {
      return { link: `/assessment/${scale.id}?continue=${status?.assessmentId}`, text: '继续测评', icon: PlayCircle };
    }
    if (currentStatus === 'abandoned') {
      return { link: '#', text: '等待重置', icon: Clock };
    }
    return { link: `/assessment/${scale.id}`, text: '开始测评', icon: PlayCircle };
  };

  const action = getAction();
  const ActionIcon = action.icon;

  return (
    <motion.div
      className={`perspective-1000 h-full ${className}`}
      style={{ perspective: '1000px' }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <div
        ref={cardRef}
        className="relative will-change-transform cursor-pointer group h-full"
        style={{
          transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Card Container */}
        <Link to={action.link} className="block h-full">
          <div className="relative rounded-2xl overflow-hidden h-full">
            {/* Animated Border */}
            <div
              className={`absolute inset-0 rounded-2xl p-[1.5px] transition-opacity duration-300 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #a855f7, #14b8a6)',
                backgroundSize: '200% 200%',
                animation: isHovered ? 'gradient-rotate 3s linear infinite' : 'none',
              }}
            >
              <div className="absolute inset-[1.5px] rounded-2xl bg-white dark:bg-gray-900" />
            </div>

            {/* Main Card */}
            <div
              className={`relative rounded-2xl border transition-all duration-300 h-full ${
                isHovered
                  ? 'bg-white dark:bg-gray-800/90 border-transparent shadow-xl'
                  : 'bg-white/80 dark:bg-white/[0.06] border-gray-200/60 dark:border-white/[0.08] shadow-md'
              }`}
              style={{
                boxShadow: isHovered ? `0 20px 40px -15px ${config.glowColor}` : undefined,
              }}
            >
              {/* Decorative Corner */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${config.glowColor}, transparent)`,
                  opacity: isHovered ? 1 : 0.5,
                }}
              />

              <div className="relative p-5 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {scale.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2rem]">
                      {scale.description || '暂无描述'}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex-shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                    <span className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {config.badge}
                    </span>
                  </div>
                </div>

                {/* Scale Info */}
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {scale.total_questions || '?'} 题
                  </span>
                  {scale.estimated_duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      约 {scale.estimated_duration} 分钟
                    </span>
                  )}
                </div>

                {/* Spacer to push action button to bottom */}
                <div className="flex-grow" />

                {/* Progress Bar (for in_progress) */}
                {currentStatus === 'in_progress' && status?.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">答题进度</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {status.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${status.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div
                  className={`flex items-center justify-between py-2.5 px-4 rounded-xl transition-all duration-300 ${
                    currentStatus === 'abandoned'
                      ? 'bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 group-hover:from-primary-100 group-hover:to-secondary-100 dark:group-hover:from-primary-900/50 dark:group-hover:to-secondary-900/50'
                  }`}
                >
                  <span className={`text-sm font-semibold ${
                    currentStatus === 'abandoned'
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-primary-700 dark:text-primary-300'
                  }`}>
                    {action.text}
                  </span>
                  <div className={`flex items-center gap-1 transition-transform duration-300 ${
                    isHovered && currentStatus !== 'abandoned' ? 'translate-x-1' : ''
                  }`}>
                    <ActionIcon className={`w-4 h-4 ${
                      currentStatus === 'abandoned'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-primary-500 dark:text-primary-400'
                    }`} />
                    {currentStatus !== 'abandoned' && (
                      <ArrowRight className={`w-4 h-4 text-primary-500 dark:text-primary-400 transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`} />
                    )}
                  </div>
                </div>

                {/* Sparkle on hover */}
                {isHovered && currentStatus !== 'abandoned' && (
                  <Sparkles className="absolute top-3 right-3 w-4 h-4 text-primary-400 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  );
});

EnhancedScaleCard.displayName = 'EnhancedScaleCard';

export default EnhancedScaleCard;
