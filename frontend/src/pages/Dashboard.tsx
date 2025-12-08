import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import FloatingNav from '@/components/layout/FloatingNav';
import HeroSection from '@/components/dashboard/HeroSection';
import JourneyTimeline from '@/components/dashboard/JourneyTimeline';
import EnhancedScaleCard from '@/components/dashboard/EnhancedScaleCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Sparkles, ArrowRight, Zap, PenLine, Compass, ClipboardList } from 'lucide-react';
import type { Assessment, ScoreStatistics } from '@/types/assessment';
import type { Scale } from '@/types/scale';

// Status map type
interface StatusMapItem {
  assessment_id: string;
  status: string;
  progress: number;
  completed_at: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const initialized = authStore((s) => s.initialized);
  const isAuthenticated = authStore((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<Scale[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [scoreStats, setScoreStats] = useState<ScoreStatistics | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, StatusMapItem>>({});
  const [statusLoading, setStatusLoading] = useState(true);

  // Redirect teachers/admins to teacher dashboard
  useEffect(() => {
    if (user && ['teacher', 'counselor', 'admin'].includes(user.role)) {
      navigate('/teacher/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Reset state when user ID changes (account switch)
  useEffect(() => {
    if (user?.id) {
      setScales([]);
      setAllAssessments([]);
      setScoreStats(null);
      setStatusMap({});
      setLoading(true);
      setStatusLoading(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!initialized || !isAuthenticated || !user?.id) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [scalesRes, assessmentsRes, scoresRes] = await Promise.all([
          scalesAPI.listPublished({ limit: 20 }),  // Use listPublished to get scales visible to student
          assessmentsAPI.list({ limit: 100 }),
          assessmentsAPI.getScoreStats()
        ]);

        if (abortController.signal.aborted || !isMounted) return;

        // Process scales data
        if (scalesRes.success) {
          const scalesList = scalesRes.data.items || [];
          setScales(scalesList);

          // Batch fetch status
          if (scalesList.length > 0) {
            const scaleIds = scalesList.map((s: Scale) => s.id);
            try {
              const statusRes = await assessmentsAPI.getStatusBatch(scaleIds);
              if (!abortController.signal.aborted && isMounted && statusRes.success && statusRes.data) {
                setStatusMap(statusRes.data);
              }
            } catch {
              // Silently ignore status fetch errors
            }
          }
          if (!abortController.signal.aborted && isMounted) setStatusLoading(false);
        }

        // Process assessments data
        if (assessmentsRes.success && assessmentsRes.data) {
          const items = assessmentsRes.data.items || [];
          if (!abortController.signal.aborted && isMounted) {
            setAllAssessments(items);
          }
        }

        // Process score stats
        if (scoresRes.success && scoresRes.data && !abortController.signal.aborted && isMounted) {
          setScoreStats(scoresRes.data);
        }
      } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || abortController.signal.aborted) {
          return;
        }
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
  }, [initialized, isAuthenticated, user?.id]);

  // Calculate stats and recent assessments in single pass (O(n) instead of O(3n))
  const { stats, recentAssessments } = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    const recent: Array<{
      id: string;
      scale_id: string;
      scale_name: string;
      status: 'in_progress' | 'completed' | 'abandoned';
      progress: number;
      score?: number;
      created_at: string;
      completed_at: string | null;
    }> = [];

    for (let i = 0; i < allAssessments.length; i++) {
      const a = allAssessments[i];
      // Count stats
      if (a.status === 'completed') completed++;
      else if (a.status === 'in_progress') inProgress++;

      // Build recent list (first 5 items)
      if (recent.length < 5) {
        recent.push({
          id: a.id,
          scale_id: a.scale_id,
          scale_name: (a as any).scales?.name || '未命名测评',
          status: a.status as 'in_progress' | 'completed' | 'abandoned',
          progress: a.progress || 0,
          score: a.raw_scores?.total_score,
          created_at: a.started_at,
          completed_at: a.completed_at,
        });
      }
    }

    return {
      stats: { total: scales.length, completed, inProgress },
      recentAssessments: recent,
    };
  }, [allAssessments, scales.length]);

  // Transform status map for EnhancedScaleCard
  const getScaleStatus = (scaleId: string) => {
    const item = statusMap[scaleId];
    if (!item) return undefined;
    return {
      status: item.status as 'in_progress' | 'completed' | 'abandoned' | null,
      assessmentId: item.assessment_id,
      progress: item.progress,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Floating Navigation */}
      <FloatingNav transparentOnTop={true} />

      {/* Hero Section */}
      <HeroSection
        user={user}
        stats={stats}
        avgScore={scoreStats?.avg_score ?? null}
        isLoading={loading}
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Timeline & Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Journey Timeline */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <JourneyTimeline assessments={recentAssessments} />
            )}
          </div>

          {/* Quick Action Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                快速开始
              </h3>
              <Link
                to="/scales"
                className="group block p-6 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 dark:from-primary-600 dark:to-secondary-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">
                  开始新测评
                </h4>
                <p className="text-white/80 text-sm">
                  探索更多心理测评量表，了解自己的内心世界
                </p>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <span className="text-white/90 text-sm font-medium">
                    {scales.length} 个量表可用
                  </span>
                </div>
              </Link>

              {/* Additional Quick Stats */}
              {stats.inProgress > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <PenLine className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {stats.inProgress} 个测评进行中
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        点击上方卡片继续完成
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Explore Scales Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              探索测评
            </h2>
            <Link
              to="/scales"
              className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading || statusLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : scales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4">
                <ClipboardList className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                暂无可用的测评量表
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                请稍后再来查看
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {scales.slice(0, 8).map((scale, index) => (
                <EnhancedScaleCard
                  key={scale.id}
                  scale={scale}
                  status={getScaleStatus(scale.id)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Show more button if more than 8 scales */}
          {scales.length > 8 && (
            <div className="flex justify-center mt-8">
              <Link
                to="/scales"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-primary-300 dark:hover:border-primary-600 transition-all shadow-sm hover:shadow"
              >
                查看更多量表
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
