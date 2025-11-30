import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import type { Assessment } from '@/types/assessment';
import { Download, Home, AlertCircle, TrendingUp, Brain, Activity, RefreshCw } from 'lucide-react';

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!id) return;

    assessmentsAPI
      .get(id)
      .then((res) => {
        if (res.success) {
          setAssessment(res.data);

          if (res.data.status !== 'completed') {
            toast.error('测评尚未完成');
            navigate(`/assessment/${id}`);
          }
        } else {
          toast.error('获取报告失败');
        }
      })
      .catch(() => {
        toast.error('获取报告失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate]);

  // 重新生成 AI 报告
  const handleRegenerateReport = async () => {
    if (!id || regenerating) return;

    setRegenerating(true);
    const loadingToast = toast.loading('正在生成 AI 分析报告，请稍候...');

    try {
      const res = await assessmentsAPI.regenerateReport(id);
      toast.dismiss(loadingToast);

      if (res.success) {
        setAssessment(res.data);
        toast.success('AI 报告生成成功');
      } else {
        toast.error(res.message || '报告生成失败');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || '报告生成失败，请稍后重试');
    } finally {
      setRegenerating(false);
    }
  };

  const getSeverityInfo = (severity?: string) => {
    const severityMap = {
      normal: { label: '正常', variant: 'success' as const, icon: '✅' },
      mild: { label: '轻度', variant: 'info' as const, icon: '⚠️' },
      moderate: { label: '中度', variant: 'warning' as const, icon: '⚠️' },
      severe: { label: '重度', variant: 'danger' as const, icon: '🚨' },
    };
    return severityMap[severity as keyof typeof severityMap] || severityMap.normal;
  };

  // 提取数据 - 在 hooks 之前
  const factorScores = assessment?.raw_scores?.factor_scores || {};
  const aiReport = assessment?.metadata?.ai_report;
  const severityInfo = getSeverityInfo(assessment?.raw_scores?.severity);

  // useMemo 必须在所有条件返回之前调用，保证 hooks 调用顺序一致
  const radarChartData = useMemo(() => {
    return Object.entries(factorScores).map(([factor, data]: [string, any]) => ({
      factor: factor.length > 6 ? factor.slice(0, 6) + '...' : factor,
      fullName: factor,
      score: data.mean || 0,
      标准值: 1.44,
    }));
  }, [factorScores]);

  const barChartData = useMemo(() => {
    return Object.entries(factorScores).map(([factor, data]: [string, any]) => ({
      factor: factor.length > 8 ? factor.slice(0, 8) + '...' : factor,
      fullName: factor,
      您的得分: data.mean || 0,
      标准值: 1.44,
    }));
  }, [factorScores]);

  const barChartColors = useMemo(() => {
    return Object.entries(factorScores).map(([_, data]: [string, any]) => {
      const mean = data.mean || 0;
      return mean > 2 ? '#f59e0b' : mean > 1.5 ? '#10b981' : '#14b8a6';
    });
  }, [factorScores]);

  // 条件返回 - 在所有 hooks 之后
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载报告中..." />
        </div>
      </MainLayout>
    );
  }

  if (!assessment || assessment.status !== 'completed') {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              报告未找到
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              该测评报告不存在或尚未生成
            </p>
            <Button onClick={() => navigate('/dashboard')}>返回首页</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                测评报告
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {assessment.scales?.name} • {new Date(assessment.completed_at!).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={severityInfo.variant}>
                {severityInfo.icon} {severityInfo.label}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Total Score */}
          <Card variant="gradient" className="text-center relative overflow-hidden border-2 border-primary-200 dark:border-primary-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-800 dark:to-primary-900 rounded-full -mr-16 -mt-16 opacity-30" />
            <div className="relative">
              <TrendingUp className="mx-auto text-primary-600 dark:text-primary-400 mb-3" size={32} />
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                {assessment.raw_scores?.total_score?.toFixed(0) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总分</div>
            </div>
          </Card>

          {/* Mean Score */}
          <Card variant="gradient" className="text-center relative overflow-hidden border-2 border-purple-200 dark:border-purple-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-800 dark:to-purple-900 rounded-full -mr-16 -mt-16 opacity-30" />
            <div className="relative">
              <Brain className="mx-auto text-purple-600 dark:text-purple-400 mb-3" size={32} />
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {assessment.raw_scores?.total_mean?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">平均分</div>
            </div>
          </Card>

          {/* Status */}
          <Card variant="gradient" className="text-center relative overflow-hidden border-2 border-green-200 dark:border-green-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-900 rounded-full -mr-16 -mt-16 opacity-30" />
            <div className="relative">
              <div className="text-5xl mb-3">{severityInfo.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {severityInfo.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">总体评估</div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        {Object.keys(factorScores).length > 0 && (
          <>
            {/* Radar Chart */}
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-primary-600 dark:text-primary-400" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  因子雷达图
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <PolarAngleAxis
                    dataKey="factor"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    className="dark:fill-gray-400"
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fill: '#6b7280' }} />
                  <Radar
                    name="您的得分"
                    dataKey="score"
                    stroke="#14b8a6"
                    fill="#14b8a6"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="标准值"
                    dataKey="标准值"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Bar Chart */}
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  因子得分对比
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis
                    dataKey="factor"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#6b7280' }} domain={[0, 4]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    labelFormatter={(value, payload: any) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullName;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="您的得分" radius={[8, 8, 0, 0]}>
                    {barChartColors.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                  <Bar dataKey="标准值" fill="#a855f7" radius={[8, 8, 0, 0]} fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* Factor Scores */}
        {Object.keys(factorScores).length > 0 && (
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              因子详细得分
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(factorScores).map(([factor, data]: [string, any]) => {
                const score = data.total_score || data.score || 0;
                const mean = data.mean_score || data.mean || 0;
                // 🆕 使用从后端返回的 above_norm 字段，而不是硬编码阈值
                const isAboveNorm = data.above_norm || false;

                return (
                  <div
                    key={factor}
                    className={`p-4 rounded-lg border-2 ${
                      isAboveNorm
                        ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {data.name || factor}
                      </h3>
                      {isAboveNorm && (
                        <Badge variant="warning" className="text-xs">偏高</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">总分</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">均分</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {mean.toFixed(2)}
                        </span>
                      </div>
                      {data.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {data.description}
                        </p>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          isAboveNorm
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (mean / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* 🆕 Severity Info & Suggestions */}
        {assessment.raw_scores?.severity_info && (
          <Card className="mb-6 border-2 border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-indigo-600 dark:text-indigo-400" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  评估说明
                </h2>
              </div>

              {/* 描述 */}
              {assessment.raw_scores.severity_info.description && (
                <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {assessment.raw_scores.severity_info.description}
                  </p>
                </div>
              )}

              {/* 建议 */}
              {assessment.raw_scores.severity_info.suggestions &&
               assessment.raw_scores.severity_info.suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    💡 建议事项
                  </h3>
                  <ul className="space-y-2">
                    {assessment.raw_scores.severity_info.suggestions.map((suggestion: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {suggestion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </Card>
        )}

        {/* AI Report */}
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🤖</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI 分析报告
              </h2>
            </div>
            <Button
              onClick={handleRegenerateReport}
              disabled={regenerating}
              variant="outline"
              size="sm"
              iconLeft={<RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />}
            >
              {regenerating ? '生成中...' : aiReport ? '重新生成' : '生成报告'}
            </Button>
          </div>
          {aiReport ? (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI 分析报告尚未生成，点击上方按钮生成专属分析报告
              </p>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="gradient-primary"
            size="lg"
            iconLeft={<Home size={20} />}
          >
            返回首页
          </Button>
          <Button
            onClick={() => {
              toast.success('导出功能开发中...');
            }}
            variant="gradient-secondary"
            size="lg"
            iconLeft={<Download size={20} />}
          >
            导出报告
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
