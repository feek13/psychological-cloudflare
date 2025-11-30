import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import type { Assessment } from '@/types/assessment';
import { FileText, Calendar, TrendingUp, History as HistoryIcon, BarChart3, Zap } from 'lucide-react';

export default function History() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, []);

  const loadAssessments = () => {
    assessmentsAPI
      .list({ limit: 100 })
      .then((res) => {
        if (res.success) {
          setAssessments(res.data.items);
        } else {
          toast.error('获取历史记录失败');
        }
      })
      .catch(() => {
        toast.error('获取历史记录失败');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      completed: { label: '已完成', variant: 'success' as const },
      in_progress: { label: '进行中', variant: 'warning' as const },
      abandoned: { label: '已放弃', variant: 'default' as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.in_progress;
  };

  const getSeverityBadge = (severity?: string) => {
    const severityMap = {
      normal: { label: '正常', variant: 'success' as const },
      mild: { label: '轻度', variant: 'info' as const },
      moderate: { label: '中度', variant: 'warning' as const },
      severe: { label: '重度', variant: 'danger' as const },
    };
    return severityMap[severity as keyof typeof severityMap];
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载中..." />
        </div>
      </MainLayout>
    );
  }

  // useMemo 缓存统计数据
  const computedStats = useMemo(() => ({
    total: assessments.length,
    completed: assessments.filter(a => a.status === 'completed').length,
    inProgress: assessments.filter(a => a.status === 'in_progress').length,
  }), [assessments]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <HistoryIcon className="text-primary-600 dark:text-primary-400" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              测评历史
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            查看您的所有心理测评记录
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card variant="gradient" className="text-center border-2 border-primary-200 dark:border-primary-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-200 dark:bg-primary-800 rounded-full -mr-10 -mt-10 opacity-30" />
            <BarChart3 className="mx-auto text-primary-600 dark:text-primary-400 mb-2" size={24} />
            <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
              {computedStats.total}
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-2">总测评数</div>
          </Card>

          <Card variant="gradient" className="text-center border-2 border-green-200 dark:border-green-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 dark:bg-green-800 rounded-full -mr-10 -mt-10 opacity-30" />
            <TrendingUp className="mx-auto text-green-600 dark:text-green-400 mb-2" size={24} />
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">
              {computedStats.completed}
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-2">已完成</div>
          </Card>

          <Card variant="gradient" className="text-center border-2 border-yellow-200 dark:border-yellow-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200 dark:bg-yellow-800 rounded-full -mr-10 -mt-10 opacity-30" />
            <Zap className="mx-auto text-yellow-600 dark:text-yellow-400 mb-2" size={24} />
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {computedStats.inProgress}
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-2">进行中</div>
          </Card>
        </div>

        {/* Assessment List */}
        <Card>
          {assessments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                还没有测评记录
              </p>
              <Link to="/dashboard">
                <Button variant="gradient-primary">开始测评</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => {
                const statusBadge = getStatusBadge(assessment.status);
                const severityBadge = getSeverityBadge(assessment.raw_scores?.severity);

                return (
                  <div
                    key={assessment.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-lg hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-700 dark:hover:to-gray-700/50 transition-all duration-200 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-md hover:translate-x-1"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {assessment.scales?.name || '未知量表'}
                        </h3>
                        <Badge variant={statusBadge.variant} dot>
                          {statusBadge.label}
                        </Badge>
                        {assessment.status === 'completed' && severityBadge && (
                          <Badge variant={severityBadge.variant}>
                            {severityBadge.label}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} className="text-primary-500" />
                          {new Date(assessment.started_at).toLocaleDateString()}
                        </div>
                        {assessment.status === 'completed' && assessment.raw_scores?.total_mean && (
                          <div className="flex items-center gap-1">
                            <TrendingUp size={16} className="text-green-500" />
                            平均分: {assessment.raw_scores.total_mean.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {assessment.status === 'completed' ? (
                        <Link to={`/reports/${assessment.id}`}>
                          <Button size="sm" variant="gradient-primary">查看报告</Button>
                        </Link>
                      ) : assessment.status === 'in_progress' ? (
                        <Link to={`/assessment/${assessment.id}`}>
                          <Button size="sm" variant="outline">
                            继续答题
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
