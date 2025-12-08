import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, Calendar, TrendingUp, FileText, PlayCircle } from 'lucide-react';
import type { Assessment } from '@/types/assessment';

interface AssessmentListItemProps {
  assessment: Assessment;
  index?: number;
}

const statusConfig = {
  in_progress: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    glowColor: 'shadow-amber-500/30',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    label: '进行中',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    label: '已完成',
  },
  abandoned: {
    icon: AlertCircle,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-400',
    glowColor: 'shadow-gray-400/20',
    borderColor: 'border-gray-200 dark:border-gray-700/50',
    hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600',
    label: '已放弃',
  },
};

const severityConfig = {
  normal: { label: '正常', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  mild: { label: '轻度', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  moderate: { label: '中度', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  severe: { label: '重度', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatRelativeDate = (dateString: string) => {
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

  return formatDate(dateString);
};

const AssessmentListItem = memo(({ assessment, index = 0 }: AssessmentListItemProps) => {
  const config = statusConfig[assessment.status as keyof typeof statusConfig] || statusConfig.in_progress;
  const StatusIcon = config.icon;
  const severity = assessment.raw_scores?.severity as keyof typeof severityConfig;
  const severityInfo = severity ? severityConfig[severity] : null;

  const link = assessment.status === 'completed'
    ? `/reports/${assessment.id}`
    : assessment.status === 'in_progress'
    ? `/assessment/${assessment.id}`
    : '#';

  const actionText = assessment.status === 'completed'
    ? '查看报告'
    : assessment.status === 'in_progress'
    ? '继续测评'
    : '已放弃';

  const ActionIcon = assessment.status === 'completed' ? FileText : PlayCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link
        to={link}
        className={`block group ${assessment.status === 'abandoned' ? 'pointer-events-none' : ''}`}
      >
        <div
          className={`relative p-5 rounded-2xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border ${config.borderColor} ${
            assessment.status !== 'abandoned' ? config.hoverBorder : ''
          } transition-all duration-300 ${
            assessment.status !== 'abandoned'
              ? 'hover:shadow-lg hover:bg-white dark:hover:bg-white/[0.08] hover:scale-[1.01]'
              : ''
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Status Indicator */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center shadow-lg ${config.glowColor}`}>
              <StatusIcon className="w-5 h-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {assessment.scales?.name || '未知量表'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.color} bg-opacity-10 ${config.bgColor}/10`}>
                  {config.label}
                </span>
                {assessment.status === 'completed' && severityInfo && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityInfo.color} ${severityInfo.bgColor}`}>
                    {severityInfo.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatRelativeDate(assessment.completed_at || assessment.started_at)}
                </span>
                {assessment.status === 'completed' && assessment.raw_scores?.total_mean && (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    平均分: {assessment.raw_scores.total_mean.toFixed(2)}
                  </span>
                )}
                {assessment.status === 'in_progress' && assessment.progress !== undefined && (
                  <span className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                        style={{ width: `${assessment.progress}%` }}
                      />
                    </div>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{assessment.progress}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action */}
            {assessment.status !== 'abandoned' && (
              <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {actionText}
                </span>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                  <ActionIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

AssessmentListItem.displayName = 'AssessmentListItem';

export default AssessmentListItem;
