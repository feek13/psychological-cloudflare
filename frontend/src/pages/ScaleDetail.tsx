import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import type { Scale } from '@/types/scale';
import { Clock, FileText, AlertCircle } from 'lucide-react';

export default function ScaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scale, setScale] = useState<Scale | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [assessmentStatus, setAssessmentStatus] = useState<{
    status: 'completed' | 'in_progress' | 'abandoned' | null;
    assessmentId?: string;
    progress?: number;
  }>({ status: null });
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Load scale details
    scalesAPI
      .get(id)
      .then((res) => {
        if (res.success) {
          setScale(res.data);
        } else {
          toast.error('获取量表信息失败');
        }
      })
      .catch(() => {
        toast.error('获取量表信息失败');
      })
      .finally(() => {
        setLoading(false);
      });

    // Load assessment status
    const fetchStatus = async () => {
      try {
        const res = await assessmentsAPI.list({
          scale_id: id,
          limit: 100,
        });

        if (res.success && res.data.items.length > 0) {
          const inProgress = res.data.items.find((a: any) => a.status === 'in_progress');
          const completed = res.data.items.find((a: any) => a.status === 'completed');
          const abandoned = res.data.items.find((a: any) => a.status === 'abandoned');

          const relevantAssessment = inProgress || completed || abandoned;

          if (relevantAssessment) {
            setAssessmentStatus({
              status: relevantAssessment.status,
              assessmentId: relevantAssessment.id,
              progress: relevantAssessment.progress || 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch assessment status:', error);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();
  }, [id]);

  const handleStartAssessment = async () => {
    if (!id) return;

    // If already in progress, navigate to that assessment directly
    if (assessmentStatus.status === 'in_progress' && assessmentStatus.assessmentId) {
      navigate(`/assessment/${assessmentStatus.assessmentId}`);
      return;
    }

    // If completed, navigate to report
    if (assessmentStatus.status === 'completed' && assessmentStatus.assessmentId) {
      navigate(`/reports/${assessmentStatus.assessmentId}`);
      return;
    }

    // Create new assessment
    setStarting(true);
    try {
      const res = await assessmentsAPI.create(id);
      if (res.success) {
        toast.success('测评已创建，开始答题！');
        navigate(`/assessment/${res.data.id}`);
      } else {
        toast.error(res.message || '创建测评失败');
      }
    } catch (error) {
      toast.error('创建测评失败');
    } finally {
      setStarting(false);
    }
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

  if (!scale) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              量表未找到
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              该量表不存在或已被删除
            </p>
            <Button onClick={() => navigate('/dashboard')}>返回首页</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4">
        <Card className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {scale.name}
                </h1>
                {!statusLoading && assessmentStatus.status ? (
                  <>
                    {assessmentStatus.status === 'completed' && (
                      <Badge variant="success">✓ 已完成</Badge>
                    )}
                    {assessmentStatus.status === 'in_progress' && (
                      <Badge variant="warning">⏱ 进行中</Badge>
                    )}
                    {assessmentStatus.status === 'abandoned' && (
                      <Badge variant="danger">✗ 已放弃</Badge>
                    )}
                  </>
                ) : (
                  <Badge variant={scale.is_active ? 'success' : 'default'}>
                    {scale.is_active ? '可用' : '不可用'}
                  </Badge>
                )}
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {scale.code}
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <FileText className="text-primary-600 dark:text-primary-400" size={24} />
              <div>
                <div className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                  {scale.total_questions}
                </div>
                <div className="text-sm text-primary-600 dark:text-primary-400">题目数量</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="text-purple-600 dark:text-purple-400" size={24} />
              <div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {scale.estimated_duration}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">预计分钟</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl">📊</div>
              <div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {scale.version}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">版本号</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {scale.description && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                量表说明
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {scale.description}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {scale.instructions && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                答题须知
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-blue-800 dark:text-blue-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {scale.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {statusLoading ? (
              <Button disabled size="lg" className="flex-1">
                加载中...
              </Button>
            ) : assessmentStatus.status === 'completed' ? (
              <Button
                onClick={handleStartAssessment}
                variant="gradient-primary"
                size="lg"
                className="flex-1"
              >
                查看报告
              </Button>
            ) : assessmentStatus.status === 'in_progress' ? (
              <Button
                onClick={handleStartAssessment}
                variant="gradient-primary"
                size="lg"
                className="flex-1"
              >
                继续测评 (已完成 {assessmentStatus.progress}%)
              </Button>
            ) : assessmentStatus.status === 'abandoned' ? (
              <Button
                disabled
                variant="outline"
                size="lg"
                className="flex-1"
                title="此测评已放弃，请等待老师重置"
              >
                等待老师重置
              </Button>
            ) : (
              <Button
                onClick={handleStartAssessment}
                disabled={!scale.is_active || starting}
                isLoading={starting}
                variant="gradient-primary"
                size="lg"
                className="flex-1"
              >
                {starting ? '创建中...' : '开始测评'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              size="lg"
            >
              返回
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
