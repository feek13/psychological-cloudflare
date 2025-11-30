import { useEffect, useState } from 'react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import { teachersAPI, organizationAPI } from '@/api';
import type { TeacherListItem } from '@/types';
import type {
  TeacherPermission,
  TeacherPermissionCreate,
  TeacherPermissionAssign,
  College,
  Major,
  Class
} from '@/types/organization';
import toast from 'react-hot-toast';
import { authStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '@/hooks/useConfirm';

export default function TeacherManage() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherListItem | null>(null);
  const [teacherPermissions, setTeacherPermissions] = useState<TeacherPermission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Organization data
  const [colleges, setColleges] = useState<College[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Permission form state
  const [permissionType, setPermissionType] = useState<'school' | 'college' | 'major' | 'class'>('school');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');

  const { user } = authStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin') {
      toast.error('只有管理员可以访问此页面');
      navigate('/teacher/dashboard');
      return;
    }

    loadTeachers();
    loadOrganizationData();
  }, [user, navigate]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await teachersAPI.listTeachers({ limit: 100 });
      if (res.success) {
        setTeachers(res.data.items);
      }
    } catch (error: any) {
      console.error('Failed to load teachers:', error);
      toast.error('加载教师列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationData = async () => {
    try {
      const [collegesRes, majorsRes, classesRes] = await Promise.all([
        organizationAPI.getColleges(),
        organizationAPI.getMajors(),
        organizationAPI.getClasses()
      ]);

      setColleges(collegesRes);
      setMajors(majorsRes);
      setClasses(classesRes);
    } catch (error: any) {
      console.error('Failed to load organization data:', error);
      toast.error('加载组织架构数据失败');
    }
  };

  const loadTeacherPermissions = async (teacherId: string) => {
    try {
      setIsLoadingPermissions(true);
      const permissions = await organizationAPI.getTeacherPermissions(teacherId);
      setTeacherPermissions(permissions);
    } catch (error: any) {
      console.error('Failed to load teacher permissions:', error);
      toast.error('加载教师权限失败');
      setTeacherPermissions([]);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const openAssignModal = async (teacher: TeacherListItem) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
    // Reset form
    setPermissionType('school');
    setSelectedCollegeId('');
    setSelectedMajorId('');
    setSelectedClassId('');
    setAcademicYear('2024-2025');
    // Load existing permissions
    await loadTeacherPermissions(teacher.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTeacher(null);
    setTeacherPermissions([]);
  };

  const handleAssignPermission = async () => {
    if (!selectedTeacher) return;

    // Validate based on permission type
    let targetId: string | null = null;

    if (permissionType === 'college') {
      if (!selectedCollegeId) {
        toast.error('请选择学院');
        return;
      }
      targetId = selectedCollegeId;
    } else if (permissionType === 'major') {
      if (!selectedMajorId) {
        toast.error('请选择专业');
        return;
      }
      targetId = selectedMajorId;
    } else if (permissionType === 'class') {
      if (!selectedClassId) {
        toast.error('请选择班级');
        return;
      }
      targetId = selectedClassId;
    }

    try {
      const newPermission: TeacherPermissionCreate = {
        teacher_id: selectedTeacher.id,
        permission_type: permissionType,
        target_id: targetId,
        academic_year: academicYear
      };

      const assignment: TeacherPermissionAssign = {
        permissions: [newPermission]
      };

      await organizationAPI.assignTeacherPermissions(assignment);
      toast.success('权限分配成功');

      // Reload permissions
      await loadTeacherPermissions(selectedTeacher.id);

      // Reset form
      setPermissionType('school');
      setSelectedCollegeId('');
      setSelectedMajorId('');
      setSelectedClassId('');
    } catch (error: any) {
      console.error('Failed to assign permission:', error);
      toast.error('权限分配失败');
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    const confirmed = await confirm({
      title: '移除权限',
      message: '确定要移除该权限吗？',
      confirmText: '移除',
      cancelText: '取消',
      variant: 'warning',
    });

    if (!confirmed || !selectedTeacher) {
      return;
    }

    try {
      await organizationAPI.removeTeacherPermission(permissionId);
      toast.success('权限移除成功');

      // Reload permissions
      await loadTeacherPermissions(selectedTeacher.id);
    } catch (error: any) {
      console.error('Failed to remove permission:', error);
      toast.error('权限移除失败');
    }
  };

  const getPermissionLabel = (permission: TeacherPermission): string => {
    switch (permission.permission_type) {
      case 'school':
        return '全校权限';
      case 'college':
        return permission.college_info?.name || '学院权限';
      case 'major':
        return permission.major_info?.name || '专业权限';
      case 'class':
        return permission.class_info?.name || '班级权限';
      default:
        return '未知权限';
    }
  };

  const getPermissionTypeLabel = (type: string): string => {
    switch (type) {
      case 'school':
        return '全校';
      case 'college':
        return '学院';
      case 'major':
        return '专业';
      case 'class':
        return '班级';
      default:
        return '未知';
    }
  };

  const getPermissionColor = (type: string): string => {
    switch (type) {
      case 'school':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'college':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'major':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'class':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Filter majors and classes based on selection
  const filteredMajors = selectedCollegeId
    ? majors.filter(m => m.college_id === selectedCollegeId)
    : majors;

  const filteredClasses = selectedMajorId
    ? classes.filter(c => c.major_id === selectedMajorId)
    : classes;

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">教师权限管理</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              管理教师的层级访问权限（全校 &gt; 学院 &gt; 专业 &gt; 班级）
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            共 {teachers.length} 位教师
          </div>
        </div>

        {/* Teachers List */}
        {teachers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">暂无教师数据</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {teacher.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {teacher.username || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(teacher.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openAssignModal(teacher)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        管理权限
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission Management Modal */}
      {isModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedTeacher.full_name || selectedTeacher.username} 的权限管理
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                分配和管理该教师的数据访问权限
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Current Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  当前权限
                </h4>
                {isLoadingPermissions ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>
                ) : teacherPermissions.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    暂无权限
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teacherPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPermissionColor(permission.permission_type)}`}>
                            {getPermissionTypeLabel(permission.permission_type)}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {getPermissionLabel(permission)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({permission.academic_year})
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemovePermission(permission.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Permission */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  添加新权限
                </h4>

                {/* Permission Type Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      权限级别
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {(['school', 'college', 'major', 'class'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setPermissionType(type);
                            setSelectedCollegeId('');
                            setSelectedMajorId('');
                            setSelectedClassId('');
                          }}
                          className={`p-3 rounded-md border-2 text-sm font-medium transition-colors ${
                            permissionType === type
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {getPermissionTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      学年
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="2024-2025">2024-2025</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                    </select>
                  </div>

                  {/* College Selection (for college, major, class) */}
                  {(permissionType === 'college' || permissionType === 'major' || permissionType === 'class') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        学院
                      </label>
                      <select
                        value={selectedCollegeId}
                        onChange={(e) => {
                          setSelectedCollegeId(e.target.value);
                          setSelectedMajorId('');
                          setSelectedClassId('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">请选择学院</option>
                        {colleges.map((college) => (
                          <option key={college.id} value={college.id}>
                            {college.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Major Selection (for major, class) */}
                  {(permissionType === 'major' || permissionType === 'class') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        专业
                      </label>
                      <select
                        value={selectedMajorId}
                        onChange={(e) => {
                          setSelectedMajorId(e.target.value);
                          setSelectedClassId('');
                        }}
                        disabled={!selectedCollegeId}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">请选择专业</option>
                        {filteredMajors.map((major) => (
                          <option key={major.id} value={major.id}>
                            {major.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Class Selection (for class) */}
                  {permissionType === 'class' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        班级
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        disabled={!selectedMajorId}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">请选择班级</option>
                        {filteredClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Add Permission Button */}
                  <button
                    onClick={handleAssignPermission}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    添加权限
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
