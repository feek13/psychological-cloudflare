import { useEffect, useState } from 'react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import { teachersAPI, studentsAPI } from '@/api';
import type { StudentStatistics, GradeStatistics } from '@/types';
import type { GradeLabel } from '@/types/teachers';
import { GRADE_LABELS } from '@/types/teachers';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  BookIcon,
  SchoolIcon,
  EditDocumentIcon,
  MegaphoneIcon,
  ChartIcon,
} from '@/components/icons/DashboardIcons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [myGrades, setMyGrades] = useState<GradeLabel[]>([]);
  const [statistics, setStatistics] = useState<StudentStatistics | null>(null);
  const [gradeStats, setGradeStats] = useState<GradeStatistics[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [gradesRes, statsRes, gradeStatsRes] = await Promise.all([
        teachersAPI.getMyGrades(),
        studentsAPI.getOverview(),
        studentsAPI.getGradeStatistics(),
      ]);

      if (gradesRes.success) {
        setMyGrades(gradesRes.data as GradeLabel[]);
      }

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }

      if (gradeStatsRes.success) {
        setGradeStats(gradeStatsRes.data);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Use imported GRADE_LABELS from types

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            欢迎，教师！
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您当前负责的年级：
            {myGrades.length > 0
              ? myGrades.map((g) => GRADE_LABELS[g as GradeLabel]).join('、')
              : '暂未分配年级'}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">学生总数</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {statistics?.total_students || 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <UsersIcon className="text-indigo-600 dark:text-indigo-400" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">负责年级</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {myGrades.length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BookIcon className="text-green-600 dark:text-green-400" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">班级总数</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {statistics?.by_class ? Object.keys(statistics.by_class).length : 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <SchoolIcon className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Assessment and Score Statistics Charts */}
        {gradeStats && gradeStats.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Rate by Organization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                各组织完成率
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_completion_rate" fill="#10b981" name="完成率 (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Average Scores by Organization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                各组织平均分
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeStats.filter(s => s.avg_score !== null && s.avg_score !== undefined)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_score" fill="#8b5cf6" name="平均分" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Statistics Table */}
        {gradeStats && gradeStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              组织详细统计
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      组织
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      学生数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      总测评数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      已完成
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      完成率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      平均分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      分数范围
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {gradeStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {stat.grade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {stat.total_students}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {stat.total_assessments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {stat.completed_assessments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {stat.avg_completion_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {stat.avg_score !== null && stat.avg_score !== undefined ? (
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {stat.avg_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {stat.min_score !== null && stat.min_score !== undefined && stat.max_score !== null && stat.max_score !== undefined ? (
                          `${stat.min_score.toFixed(2)} - ${stat.max_score.toFixed(2)}`
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Grade Statistics */}
        {statistics && statistics.by_grade && Object.keys(statistics.by_grade).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              各年级学生分布
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statistics.by_grade).map(([grade, stats]) => (
                <div
                  key={grade}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {GRADE_LABELS[grade as GradeLabel] || grade}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.total_students ?? stats.student_count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            快捷操作
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/teacher/scales"
              className="group p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3 group-hover:scale-110 transition-transform">
                <EditDocumentIcon className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">管理量表</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                创建和编辑心理测评量表
              </p>
            </a>

            <a
              href="/teacher/publications"
              className="group p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg mb-3 group-hover:scale-110 transition-transform">
                <MegaphoneIcon className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">发布量表</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                向学生发布测评任务
              </p>
            </a>

            <a
              href="/teacher/students"
              className="group p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg mb-3 group-hover:scale-110 transition-transform">
                <ChartIcon className="text-cyan-600 dark:text-cyan-400" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">查看数据</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                查看学生测评数据和报告
              </p>
            </a>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
