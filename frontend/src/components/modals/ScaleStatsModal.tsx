import { useEffect, useState } from 'react';
import { X, Users, CheckCircle2, Clock, TrendingUp, BarChart3, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { scalesAPI } from '@/api/scales';
import type { ScaleStatistics } from '@/types/scale';
import toast from 'react-hot-toast';

interface ScaleStatsModalProps {
  scaleId: string;
  onClose: () => void;
}

const ScaleStatsModal = ({ scaleId, onClose }: ScaleStatsModalProps) => {
  const [stats, setStats] = useState<ScaleStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [scaleId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await scalesAPI.getStatistics(scaleId);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Prepare chart data
  const statusData = [
    { name: '已完成', value: stats.completed_assessments, color: '#10b981' },
    { name: '进行中', value: stats.in_progress_assessments, color: '#f59e0b' },
  ];

  const scoreData = stats.avg_score ? [
    { name: '平均分', value: stats.avg_score },
    { name: '最低分', value: stats.min_score || 0 },
    { name: '最高分', value: stats.max_score || 0 },
  ] : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">量表统计</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {stats.scale_code} - {stats.scale_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Assessments */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total_assessments}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">总测评数</div>
            </div>

            {/* Completed */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.completed_assessments}</div>
              <div className="text-sm text-green-700 dark:text-green-300">已完成</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">完成率 {stats.completion_rate.toFixed(1)}%</div>
            </div>

            {/* Average Score */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
              <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {stats.avg_score ? stats.avg_score.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">平均分</div>
              {stats.avg_score && (
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  范围: {stats.min_score?.toFixed(2)} - {stats.max_score?.toFixed(2)}
                </div>
              )}
            </div>

            {/* Avg Completion Time */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border-2 border-amber-200 dark:border-amber-800">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-2" />
              <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                {stats.avg_completion_time ? stats.avg_completion_time.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">平均完成时间</div>
              {stats.avg_completion_time && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">分钟</div>
              )}
            </div>
          </div>

          {/* Charts */}
          {stats.total_assessments > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-teal-600" />
                  测评状态分布
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Score Distribution */}
              {scoreData.length > 0 && (
                <div className="bg-white dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-teal-600" />
                    分数分布
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={scoreData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* No data message */}
          {stats.total_assessments === 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">暂无测评数据</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">该量表还没有学生完成测评</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScaleStatsModal;
