import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ScaleCard from '@/components/ScaleCard';
import { SkeletonCard, SkeletonGrid } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { Assessment, ScoreStatistics } from '@/types/assessment';
import type { Scale } from '@/types/scale';
import { TrendingUp, TrendingDown, Minus, ClipboardList, CheckCircle2, Clock, Activity, Brain } from 'lucide-react';

// 状态映射类型
interface StatusMapItem {
  assessment_id: string;
  status: string;
  progress: number;
  completed_at: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<Scale[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [prevStats, setPrevStats] = useState({ total: 0, completed: 0, inProgress: 0 });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [scoreStats, setScoreStats] = useState<ScoreStatistics | null>(null);
  // 新增：批量状态映射
  const [statusMap, setStatusMap] = useState<Record<string, StatusMapItem>>({});
  const [statusLoading, setStatusLoading] = useState(true);

  // Redirect teachers/admins to teacher dashboard
  useEffect(() => {
    if (user && ['teacher', 'counselor', 'admin'].includes(user.role)) {
      navigate('/teacher/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load previous stats from localStorage
    const savedStats = localStorage.getItem('dashboard_stats');
    if (savedStats) {
      try {
        setPrevStats(JSON.parse(savedStats));
      } catch {
        // Ignore parse errors
      }
    }

    // 使用 AbortController 来正确取消请求
    const abortController = new AbortController();
    let isMounted = true;

    const fetchData = async () => {
      try {
        // 并行请求 - 不使用 signal（让请求完成，只是不更新状态）
        const [scalesRes, assessmentsRes, scoresRes] = await Promise.all([
          scalesAPI.list({ is_active: true, limit: 20 }),
          assessmentsAPI.list({ limit: 100 }),
          assessmentsAPI.getScoreStats()
        ]);

        // 如果已取消，不更新状态
        if (abortController.signal.aborted || !isMounted) return;

        // 处理量表数据
        if (scalesRes.success) {
          const scalesList = scalesRes.data.items || [];
          setScales(scalesList);

          // 批量获取状态
          if (scalesList.length > 0) {
            const scaleIds = scalesList.map((s: Scale) => s.id);
            try {
              const statusRes = await assessmentsAPI.getStatusBatch(scaleIds);
              if (!abortController.signal.aborted && isMounted && statusRes.success && statusRes.data) {
                setStatusMap(statusRes.data);
              }
            } catch (statusError: any) {
              // 静默忽略状态获取错误（可能是取消导致）
            }
          }
          if (!abortController.signal.aborted && isMounted) setStatusLoading(false);
        }

        // 处理测评数据
        if (assessmentsRes.success && assessmentsRes.data) {
          const items = assessmentsRes.data.items || [];
          if (!abortController.signal.aborted && isMounted) {
            setAllAssessments(items);

            const completed = items.filter((a: any) => a.status === 'completed').length;
            const inProgress = items.filter((a: any) => a.status === 'in_progress').length;
            const total = completed + inProgress;

            const newStats = { total, completed, inProgress };
            localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
            setDataLoaded(true);
          }
        }

        // 处理分数统计
        if (scoresRes.success && scoresRes.data && !abortController.signal.aborted && isMounted) {
          setScoreStats(scoresRes.data);
        }
      } catch (error: any) {
        // 忽略取消的请求错误
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || abortController.signal.aborted) {
          return;
        }
        // 只在组件仍然挂载时记录非取消错误
        if (isMounted) {
          console.error('Failed to load dashboard data:', error);
        }
      } finally {
        if (!abortController.signal.aborted && isMounted) {
          setLoading(false);
          setStatusLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // 使用 useMemo 计算统计数据，避免重复计算
  const stats = useMemo(() => {
    const completed = allAssessments.filter((a: any) => a.status === 'completed').length;
    const inProgress = allAssessments.filter((a: any) => a.status === 'in_progress').length;
    return { total: completed + inProgress, completed, inProgress };
  }, [allAssessments]);

  // 使用 useMemo 获取最近测评（前5条）
  const recentAssessments = useMemo(() => {
    return allAssessments.slice(0, 5);
  }, [allAssessments]);

  // Calculate changes
  const getTrendInfo = (current: number, previous: number) => {
    if (previous === 0) return { change: 0, trend: 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    return { change: Math.abs(change), trend };
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Welcome Section */}
        <Card>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            欢迎回来，{user?.full_name || user?.username || '用户'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            开始您的心理健康评估之旅
          </p>
        </Card>

        {/* Stats */}
        {loading ? (
          <SkeletonGrid count={4} columns={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Assessments Card */}
            <Card variant="gradient" className="relative overflow-hidden border-2 border-primary-200 dark:border-primary-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-800 dark:to-primary-900 rounded-full -mr-16 -mt-16 opacity-30" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <ClipboardList size={20} />
                    <span className="text-sm font-medium">总测评数</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {stats.total}
                  </div>
                  {dataLoaded && (() => {
                    const trend = getTrendInfo(stats.total, prevStats.total);
                    return trend.change > 0 ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        trend.trend === 'up' ? 'text-green-600 dark:text-green-400'
                          : trend.trend === 'down' ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {trend.trend === 'up' && <TrendingUp size={16} />}
                        {trend.trend === 'down' && <TrendingDown size={16} />}
                        {trend.trend === 'neutral' && <Minus size={16} />}
                        <span className="font-medium">{trend.change.toFixed(1)}%</span>
                        <span className="text-gray-500 dark:text-gray-400">较上次</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stats.total > 0 ? '累计参与测评' : '开始首次测评'}
                      </div>
                    );
                  })()}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <ClipboardList className="text-primary-600 dark:text-primary-400" size={24} />
                </div>
              </div>
            </Card>

            {/* Completed Card */}
            <Card variant="gradient" className="relative overflow-hidden border-2 border-green-200 dark:border-green-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-medium">已完成</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {stats.completed}
                  </div>
                  {dataLoaded && (() => {
                    const trend = getTrendInfo(stats.completed, prevStats.completed);
                    const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0;
                    return (
                      <div className="flex items-center gap-2">
                        {stats.completed > 0 && trend.change > 0 && (
                          <div className={`flex items-center gap-1 text-sm ${
                            trend.trend === 'up' ? 'text-green-600 dark:text-green-400'
                              : trend.trend === 'down' ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {trend.trend === 'up' && <TrendingUp size={16} />}
                            {trend.trend === 'down' && <TrendingDown size={16} />}
                            {trend.trend === 'neutral' && <Minus size={16} />}
                            <span className="font-medium">{trend.change.toFixed(1)}%</span>
                          </div>
                        )}
                        {stats.total > 0 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            完成率 {completionRate}%
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </Card>

            {/* In Progress Card */}
            <Card variant="gradient" className="relative overflow-hidden border-2 border-yellow-200 dark:border-yellow-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 dark:bg-yellow-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                    <Clock size={20} />
                    <span className="text-sm font-medium">进行中</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {stats.inProgress}
                  </div>
                  {dataLoaded && (() => {
                    const trend = getTrendInfo(stats.inProgress, prevStats.inProgress);
                    return stats.inProgress > 0 && trend.change > 0 ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        trend.trend === 'up' ? 'text-green-600 dark:text-green-400'
                          : trend.trend === 'down' ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {trend.trend === 'up' && <TrendingUp size={16} />}
                        {trend.trend === 'down' && <TrendingDown size={16} />}
                        {trend.trend === 'neutral' && <Minus size={16} />}
                        <span className="font-medium">{trend.change.toFixed(1)}%</span>
                        <span className="text-gray-500 dark:text-gray-400">较上次</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stats.inProgress > 0 ? '待完成测评' : '暂无进行中测评'}
                      </div>
                    );
                  })()}
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
                </div>
              </div>
            </Card>

            {/* Average Score Card */}
            <Card variant="gradient" className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-900 rounded-full -mr-16 -mt-16 opacity-30" />
              <div className="relative">
                <Brain className="mx-auto text-purple-600 dark:text-purple-400 mb-3" size={32} />
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2 text-center">
                  {scoreStats?.avg_score?.toFixed(2) || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">平均分</div>
                {scoreStats && scoreStats.avg_score && scoreStats.completed_count > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>范围: {scoreStats.min_score?.toFixed(2)} - {scoreStats.max_score?.toFixed(2)}</span>
                    {scoreStats.recent_trend && (
                      <div className={`flex items-center gap-1 ${
                        scoreStats.recent_trend === 'improving' ? 'text-green-600 dark:text-green-400'
                          : scoreStats.recent_trend === 'declining' ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {scoreStats.recent_trend === 'improving' && <TrendingDown size={14} />}
                        {scoreStats.recent_trend === 'declining' && <TrendingUp size={14} />}
                        {scoreStats.recent_trend === 'stable' && <Minus size={14} />}
                      </div>
                    )}
                  </div>
                )}
                {scoreStats && scoreStats.completed_count === 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    完成测评后显示
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Recent Assessments */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">最近测评</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : recentAssessments.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="还没有测评记录"
                description="开始您的第一次测评，了解自己的心理健康状况"
              />
            ) : (
              recentAssessments.map((assessment: any) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {assessment.scales?.name || '未知量表'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {assessment.status === 'completed' ? '已完成' : '进行中'} • {new Date(assessment.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to={`/reports/${assessment.id}`}>
                    <Button size="sm" variant="gradient-primary">查看</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Available Scales */}
        <Card>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">开始新测评</h2>
          {loading ? (
            <SkeletonGrid count={4} columns={4} />
          ) : scales.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="暂无可用量表"
              description="当前没有激活的测评量表"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {scales.map((scale) => (
                <div key={scale.id} className="transition-all duration-200 hover:-translate-y-1">
                  <ScaleCard
                    scale={scale}
                    status={statusMap[scale.id]}
                    statusLoading={statusLoading}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
