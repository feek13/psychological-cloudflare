import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsAPI } from '@/api/assessments';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { Scale } from '@/types/scale';

// 外部传入的状态类型（来自批量 API）
interface ExternalStatus {
  assessment_id: string;
  status: string;
  progress: number;
  completed_at: string | null;
}

interface ScaleCardProps {
  scale: Scale;
  className?: string;
  // 新增：支持外部传入状态（避免 N+1 查询）
  status?: ExternalStatus;
  statusLoading?: boolean;
}

interface AssessmentStatus {
  status: 'completed' | 'in_progress' | 'abandoned' | null;
  assessmentId?: string;
  progress?: number;
}

export default function ScaleCard({
  scale,
  className = '',
  status: externalStatus,
  statusLoading: externalLoading
}: ScaleCardProps) {
  // 内部状态（仅在没有外部状态时使用）
  const [internalStatus, setInternalStatus] = useState<AssessmentStatus>({
    status: null,
  });
  const [internalLoading, setInternalLoading] = useState(true);

  // 如果有外部状态，转换为内部格式；否则使用内部状态
  const assessmentStatus: AssessmentStatus = externalStatus
    ? {
        status: externalStatus.status as AssessmentStatus['status'],
        assessmentId: externalStatus.assessment_id,
        progress: externalStatus.progress || 0,
      }
    : internalStatus;

  // 如果外部传入了 loading 状态，使用它；否则使用内部 loading
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    // 如果外部传入了 loading 状态（即使用批量模式），不需要发请求
    // 使用 externalLoading !== undefined 而不是 externalStatus !== undefined
    // 因为某些量表可能没有测评记录，statusMap[scale.id] 为 undefined
    if (externalLoading !== undefined) {
      setInternalLoading(false);
      return;
    }

    // 只有没有外部状态时才发请求（向后兼容）
    const fetchStatus = async () => {
      try {
        const res = await assessmentsAPI.list({
          scale_id: scale.id,
          limit: 10,
        });

        if (res.success && res.data.items.length > 0) {
          const inProgress = res.data.items.find((a: any) => a.status === 'in_progress');
          const completed = res.data.items.find((a: any) => a.status === 'completed');
          const abandoned = res.data.items.find((a: any) => a.status === 'abandoned');

          const relevantAssessment = inProgress || completed || abandoned;

          if (relevantAssessment) {
            // 直接使用 list 返回的数据，不再发 verification call
            setInternalStatus({
              status: relevantAssessment.status,
              assessmentId: relevantAssessment.id,
              progress: relevantAssessment.progress || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch assessment status:', error);
      } finally {
        setInternalLoading(false);
      }
    };

    fetchStatus();
  }, [scale.id, externalLoading]);

  const renderStatusBadge = () => {
    if (loading) return null;

    switch (assessmentStatus.status) {
      case 'completed':
        return <Badge variant="success">✓ 已完成</Badge>;
      case 'in_progress':
        return <Badge variant="warning">⏱ 进行中</Badge>;
      case 'abandoned':
        return <Badge variant="danger">✗ 已放弃</Badge>;
      default:
        return null;
    }
  };

  const renderActionButton = () => {
    if (loading) {
      return (
        <Button size="sm" variant="outline" className="w-full mt-3" disabled>
          加载中...
        </Button>
      );
    }

    switch (assessmentStatus.status) {
      case 'completed':
        return (
          <Link to={`/reports/${assessmentStatus.assessmentId}`}>
            <Button size="sm" variant="outline" className="w-full mt-3">
              查看报告
            </Button>
          </Link>
        );
      case 'in_progress':
        return (
          <Link to={`/assessment/${assessmentStatus.assessmentId}`}>
            <Button size="sm" variant="gradient-primary" className="w-full mt-3">
              继续测评 (已完成 {assessmentStatus.progress}%)
            </Button>
          </Link>
        );
      case 'abandoned':
        return (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3"
            disabled
            title="此测评已放弃，请等待老师重置"
          >
            等待老师重置
          </Button>
        );
      default:
        return (
          <Link to={`/scales/${scale.id}`}>
            <Button size="sm" variant="gradient-primary" className="w-full mt-3">
              开始测评
            </Button>
          </Link>
        );
    }
  };

  return (
    <div
      className={`p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 ${className}`}
    >
      {/* Status Badge in top-right corner */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-2xl">🧠</div>
        {renderStatusBadge()}
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{scale.code}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{scale.name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {scale.total_questions}题 • {scale.estimated_duration}分钟
      </p>

      {renderActionButton()}
    </div>
  );
}
