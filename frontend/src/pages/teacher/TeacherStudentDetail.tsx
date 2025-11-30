import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TeacherLayout from '@/components/layout/TeacherLayout';
import { studentsAPI } from '@/api';
import type { StudentDetail, StudentReportItem } from '@/types';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Calendar, BookOpen } from 'lucide-react';

export default function TeacherStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [reports, setReports] = useState<StudentReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (id) {
      loadStudent();
      loadReports();
    }
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const res = await studentsAPI.getDetail(id!);
      if (res.success) {
        setStudent(res.data);
      }
    } catch (error: any) {
      console.error('Failed to load student:', error);
      toast.error('加载学生信息失败');
      navigate('/teacher/students');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const res = await studentsAPI.getReports(id!);
      if (res.success) {
        setReports(res.data);
      }
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      toast.error('加载测评记录失败');
    } finally {
      setLoadingReports(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      in_progress: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      abandoned: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };
    const labels = {
      completed: '已完成',
      in_progress: '进行中',
      abandoned: '已放弃',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      </TeacherLayout>
    );
  }

  if (!student) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">学生不存在</div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/teacher/students')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回学生列表
          </button>
        </div>

        {/* Student Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {student.full_name ? student.full_name.charAt(0) : (student.username ? student.username.charAt(0).toUpperCase() : '?')}
              </div>
            </div>

            {/* Student Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {student.full_name || student.username || '未知'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <User size={18} className="mr-2" />
                  <span>学号：{student.student_id || '未设置'}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <BookOpen size={18} className="mr-2" />
                  <span>年级：{student.grade || '未分配'}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <BookOpen size={18} className="mr-2" />
                  <span>班级：{student.class_name || '未分配'}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar size={18} className="mr-2" />
                  <span>注册时间：{new Date(student.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {student.last_login_at && (
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  最后登录：{new Date(student.last_login_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">测评记录</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              该学生参与您发布的量表测评记录
            </p>
          </div>

          <div className="p-6">
            {loadingReports ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">加载中...</div>
            ) : reports.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                该学生暂无测评记录
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.assessment_id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {report.scale_name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          代码：{report.scale_code}
                        </p>
                        <div className="flex items-center space-x-4 mt-3">
                          <div>{getStatusBadge(report.status)}</div>
                          {report.completed_at && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              完成时间：{new Date(report.completed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {report.has_report && report.status === 'completed' ? (
                          <Link
                            to={`/reports/${report.assessment_id}`}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                          >
                            查看报告
                          </Link>
                        ) : report.status === 'in_progress' ? (
                          <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-sm">
                            未完成
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-sm">
                            无报告
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
