import { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import type { Scale } from '@/types/scale';
import { FileText, Clock, Search, Sparkles } from 'lucide-react';

// 测评状态类型
interface AssessmentStatus {
  assessment_id: string;
  status: string; // API returns string, component handles specific values
  progress: number;
  completed_at: string | null;
}

// Sub-component for individual scale card - 使用 memo 优化
const ScaleListCard = memo(function ScaleListCard({
  scale,
  status,
  statusLoading
}: {
  scale: Scale;
  status?: AssessmentStatus;
  statusLoading: boolean;
}) {
  const renderActionButton = () => {
    if (!scale.is_active) {
      return (
        <Button className="w-full" variant="outline" disabled>
          暂不可用
        </Button>
      );
    }

    if (statusLoading) {
      return (
        <Button className="w-full" variant="outline" disabled>
          加载中...
        </Button>
      );
    }

    if (!status) {
      return (
        <Link to={`/scales/${scale.id}`} className="block">
          <Button className="w-full" variant="gradient-primary">
            开始测评
          </Button>
        </Link>
      );
    }

    switch (status.status) {
      case 'completed':
        return (
          <Link to={`/reports/${status.assessment_id}`} className="block">
            <Button className="w-full" variant="outline">
              查看报告
            </Button>
          </Link>
        );
      case 'in_progress':
        return (
          <Link to={`/assessment/${status.assessment_id}`} className="block">
            <Button className="w-full" variant="gradient-primary">
              继续测评 (已完成 {status.progress}%)
            </Button>
          </Link>
        );
      case 'abandoned':
        return (
          <Button
            className="w-full"
            variant="outline"
            disabled
            title="此测评已放弃，请等待老师重置"
          >
            等待老师重置
          </Button>
        );
      default:
        return (
          <Link to={`/scales/${scale.id}`} className="block">
            <Button className="w-full" variant="gradient-primary">
              开始测评
            </Button>
          </Link>
        );
    }
  };

  const renderStatusBadge = () => {
    if (statusLoading || !status) {
      return (
        <Badge
          variant={scale.is_active ? 'success' : 'default'}
          dot
          pulse={scale.is_active}
        >
          {scale.is_active ? '可用' : '不可用'}
        </Badge>
      );
    }

    switch (status.status) {
      case 'completed':
        return <Badge variant="success">✓ 已完成</Badge>;
      case 'in_progress':
        return <Badge variant="warning">⏱ 进行中</Badge>;
      case 'abandoned':
        return <Badge variant="danger">✗ 已放弃</Badge>;
      default:
        return (
          <Badge
            variant={scale.is_active ? 'success' : 'default'}
            dot
            pulse={scale.is_active}
          >
            {scale.is_active ? '可用' : '不可用'}
          </Badge>
        );
    }
  };

  return (
    <div className="transition-all duration-200 hover:-translate-y-1">
      <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {scale.code}
              </h3>
              {renderStatusBadge()}
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {scale.name}
            </p>
          </div>

          {/* Description */}
          {scale.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {scale.description}
            </p>
          )}

          {/* Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <FileText size={16} className="text-primary-500" />
              <span className="font-medium">{scale.total_questions} 题</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} className="text-secondary-500" />
              <span className="font-medium">{scale.estimated_duration} 分钟</span>
            </div>
          </div>

          {/* Action */}
          {renderActionButton()}
        </div>
      </Card>
    </div>
  );
});

export default function Scales() {
  const [scales, setScales] = useState<Scale[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AssessmentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. 先加载量表列表
      const scalesRes = await scalesAPI.listPublished({ limit: 100 });

      if (!scalesRes.success) {
        toast.error('获取量表列表失败');
        return;
      }

      const scalesList = scalesRes.data.items || [];
      setScales(scalesList);
      setLoading(false);

      // 2. 批量获取所有量表的测评状态（一次请求替代 N 次请求）
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

  const filteredScales = scales.filter(
    (scale) =>
      scale.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scale.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载中..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-primary-600 dark:text-primary-400" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              量表库
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            选择适合您的心理评估量表
          </p>
        </div>

        {/* Search */}
        <Card variant="gradient" className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="搜索量表名称、编号或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>
        </Card>

        {/* Scales Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScales.length === 0 ? (
            <div className="col-span-full">
              <Card className="text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? '未找到匹配的量表' : '暂无可用量表'}
                </p>
              </Card>
            </div>
          ) : (
            filteredScales.map((scale) => (
              <ScaleListCard
                key={scale.id}
                scale={scale}
                status={statusMap[scale.id]}
                statusLoading={statusLoading}
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
