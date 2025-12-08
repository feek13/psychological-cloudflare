import { useEffect, useState, useMemo } from 'react';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import { authStore } from '@/store/authStore';
import FloatingNav from '@/components/layout/FloatingNav';
import PageHeroHeader from '@/components/shared/PageHeroHeader';
import FilterTabs from '@/components/shared/FilterTabs';
import EnhancedScaleCard from '@/components/dashboard/EnhancedScaleCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import type { Scale } from '@/types/scale';
import { Brain, Search, ClipboardList, Sparkles } from 'lucide-react';

// Assessment status type
interface AssessmentStatus {
  assessment_id: string;
  status: string;
  progress: number;
  completed_at: string | null;
}

type FilterKey = 'all' | 'available' | 'in_progress' | 'completed';

export default function Scales() {
  const [scales, setScales] = useState<Scale[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AssessmentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const initialized = authStore((state) => state.initialized);
  const isAuthenticated = authStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      loadData();
    }
  }, [initialized, isAuthenticated]);

  const loadData = async () => {
    try {
      const scalesRes = await scalesAPI.listPublished({ limit: 100 });

      if (!scalesRes.success) {
        toast.error('获取量表列表失败');
        return;
      }

      const scalesList = scalesRes.data.items || [];
      setScales(scalesList);
      setLoading(false);

      if (scalesList.length > 0) {
        const scaleIds = scalesList.map((s: Scale) => s.id);
        const statusRes = await assessmentsAPI.getStatusBatch(scaleIds);

        if (statusRes.success && statusRes.data) {
          setStatusMap(statusRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to load scales:', error);
      toast.error('获取量表列表失败');
    } finally {
      setLoading(false);
      setStatusLoading(false);
    }
  };

  // Calculate counts for filter tabs
  const counts = useMemo(() => {
    const available = scales.filter(s => !statusMap[s.id] || !statusMap[s.id].status).length;
    const inProgress = scales.filter(s => statusMap[s.id]?.status === 'in_progress').length;
    const completed = scales.filter(s => statusMap[s.id]?.status === 'completed').length;
    return { all: scales.length, available, inProgress, completed };
  }, [scales, statusMap]);

  // Filter tabs configuration
  const filterTabs = useMemo(() => [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'available', label: '未开始', count: counts.available },
    { key: 'in_progress', label: '进行中', count: counts.inProgress },
    { key: 'completed', label: '已完成', count: counts.completed },
  ], [counts]);

  // Filter scales by search term and status
  const filteredScales = useMemo(() => {
    return scales.filter((scale) => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        scale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scale.description?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      const status = statusMap[scale.id]?.status;
      switch (activeFilter) {
        case 'available':
          return !status || status === 'abandoned';
        case 'in_progress':
          return status === 'in_progress';
        case 'completed':
          return status === 'completed';
        default:
          return true;
      }
    });
  }, [scales, statusMap, searchTerm, activeFilter]);

  // Transform status for EnhancedScaleCard
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

      {/* Hero Header with Search */}
      <PageHeroHeader
        icon={Brain}
        title="探索心理量表"
        subtitle="发现适合你的心理测评工具，开启自我探索之旅"
      >
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            placeholder="搜索量表名称、编号或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
          />
        </div>
      </PageHeroHeader>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Filter Tabs */}
        <div className="mb-8">
          <FilterTabs
            tabs={filterTabs}
            activeTab={activeFilter}
            onChange={(key) => setActiveFilter(key as FilterKey)}
          />
        </div>

        {/* Scales Grid */}
        {loading || statusLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredScales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-gray-200/50 dark:border-white/[0.06]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4">
              {searchTerm ? (
                <Search className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              ) : (
                <ClipboardList className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-center font-medium">
              {searchTerm ? '未找到匹配的量表' : activeFilter === 'all' ? '暂无可用量表' : '该分类下暂无量表'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {searchTerm ? '请尝试其他关键词' : '请稍后再来查看'}
            </p>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                共找到 <span className="font-semibold text-primary-600 dark:text-primary-400">{filteredScales.length}</span> 个量表
              </span>
            </div>

            {/* Scales Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredScales.map((scale, index) => (
                <EnhancedScaleCard
                  key={scale.id}
                  scale={scale}
                  status={getScaleStatus(scale.id)}
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
