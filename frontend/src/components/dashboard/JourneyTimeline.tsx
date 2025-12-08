import { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, Rocket, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Assessment {
  id: string;
  scale_id: string;
  scale_name?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  progress?: number;
  score?: number;
  created_at: string;
  completed_at?: string;
}

interface JourneyTimelineProps {
  assessments: Assessment[];
  className?: string;
}

const statusConfig = {
  in_progress: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    glowColor: 'shadow-amber-500/50',
    label: '进行中',
    dotClass: 'animate-pulse',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/50',
    label: '已完成',
    dotClass: '',
  },
  abandoned: {
    icon: AlertCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    glowColor: 'shadow-gray-400/30',
    label: '已放弃',
    dotClass: '',
  },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? '刚刚' : `${diffMins}分钟前`;
    }
    return `${diffHours}小时前`;
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const TimelineItem = memo(({
  assessment,
  index,
  isLast,
}: {
  assessment: Assessment;
  index: number;
  isLast: boolean;
}) => {
  const config = statusConfig[assessment.status];
  const Icon = config.icon;

  const link = assessment.status === 'completed'
    ? `/reports/${assessment.id}`
    : assessment.status === 'in_progress'
    ? `/assessment/${assessment.scale_id}?continue=${assessment.id}`
    : '#';

  return (
    <motion.div
      className="relative flex items-start gap-4 group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >

      {/* Status Dot */}
      <div className={`relative flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center shadow-lg ${config.glowColor} ${config.dotClass}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Content Card */}
      <Link
        to={link}
        className={`flex-1 p-4 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.08] transition-all duration-300 ${
          assessment.status !== 'abandoned'
            ? 'hover:bg-white dark:hover:bg-white/[0.1] hover:shadow-lg hover:scale-[1.02] hover:border-primary-300 dark:hover:border-primary-500/30 cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {assessment.scale_name || '未命名测评'}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(assessment.completed_at || assessment.created_at)}
              </span>
            </div>
          </div>

          {/* Action Indicator */}
          {assessment.status !== 'abandoned' && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {assessment.status === 'completed' ? '查看报告' : '继续测评'}
              </span>
              <ArrowRight className="w-4 h-4 text-primary-500" />
            </div>
          )}

          {/* Score Badge (for completed) */}
          {assessment.status === 'completed' && assessment.score !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {assessment.score}分
              </span>
            </div>
          )}

          {/* Progress (for in_progress) */}
          {assessment.status === 'in_progress' && assessment.progress !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${assessment.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {assessment.progress}%
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
});

TimelineItem.displayName = 'TimelineItem';

const JourneyTimeline = memo(({ assessments, className = '' }: JourneyTimelineProps) => {
  // Only show recent 5
  const recentAssessments = assessments.slice(0, 5);

  if (recentAssessments.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Rocket className="w-3.5 h-3.5 text-white" />
          </div>
          最近旅程
        </h3>
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
            <Sprout className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
            还没有测评记录
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            开始你的第一次心灵探索吧
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <Rocket className="w-3.5 h-3.5 text-white" />
        </div>
        最近旅程
      </h3>
      <div className="space-y-5">
        {recentAssessments.map((assessment, index) => (
          <TimelineItem
            key={assessment.id}
            assessment={assessment}
            index={index}
            isLast={index === recentAssessments.length - 1}
          />
        ))}
      </div>
    </div>
  );
});

JourneyTimeline.displayName = 'JourneyTimeline';

export default JourneyTimeline;
