/**
 * Teachers API client
 * 教师管理 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import type {
  APIResponse,
  TeacherGradeAssign,
  TeacherInfo,
  TeacherListItem,
  Grade,
} from '@/types';
import type { TeacherPermissionDetail } from '@/types/teachers';

// Helper to format response
const formatResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data
});

export const teachersAPI = {
  /**
   * Get current teacher's permissions with organization names
   * 获取当前教师的权限详情（包含组织名称）
   */
  getMyPermissions: async (): Promise<APIResponse<TeacherPermissionDetail[]>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Check user role - admin has all permissions
    const profile = await getUserProfile();
    if (profile?.role === 'admin') {
      // Admin has school-level permission by default
      return formatResponse([{
        id: 'admin-default',
        permission_level: 'school',
        college_id: null,
        major_id: null,
        class_id: null,
        college_name: undefined,
        major_name: undefined,
        class_name: undefined,
        academic_year: '2024-2025'
      }]);
    }

    const { data: permissions, error } = await supabase
      .from('teacher_permissions')
      .select('*')
      .eq('teacher_id', user.id);

    if (error) throw error;

    if (!permissions || permissions.length === 0) {
      return formatResponse([]);
    }

    // Collect IDs for batch queries
    const collegeIds = [...new Set(permissions.filter(p => p.college_id).map(p => p.college_id))];
    const majorIds = [...new Set(permissions.filter(p => p.major_id).map(p => p.major_id))];
    const classIds = [...new Set(permissions.filter(p => p.class_id).map(p => p.class_id))];

    // Batch fetch organization names
    const [colleges, majors, classes] = await Promise.all([
      collegeIds.length > 0
        ? supabase.from('colleges').select('id, name').in('id', collegeIds).then(r => r.data || [])
        : Promise.resolve([]),
      majorIds.length > 0
        ? supabase.from('majors').select('id, name').in('id', majorIds).then(r => r.data || [])
        : Promise.resolve([]),
      classIds.length > 0
        ? supabase.from('classes').select('id, name').in('id', classIds).then(r => r.data || [])
        : Promise.resolve([])
    ]);

    const collegeMap = new Map<string, string>(colleges.map(c => [c.id, c.name] as [string, string]));
    const majorMap = new Map<string, string>(majors.map(m => [m.id, m.name] as [string, string]));
    const classMap = new Map<string, string>(classes.map(c => [c.id, c.name] as [string, string]));

    // Build permission details with organization names
    const permissionDetails: TeacherPermissionDetail[] = permissions.map(perm => ({
      id: perm.id,
      permission_level: perm.permission_level as 'school' | 'college' | 'major' | 'class',
      college_id: perm.college_id,
      major_id: perm.major_id,
      class_id: perm.class_id,
      college_name: perm.college_id ? collegeMap.get(perm.college_id) : undefined,
      major_name: perm.major_id ? majorMap.get(perm.major_id) : undefined,
      class_name: perm.class_id ? classMap.get(perm.class_id) : undefined,
      academic_year: perm.academic_year || '2024-2025'
    }));

    return formatResponse(permissionDetails);
  },

  /**
   * Get current teacher's permissions
   * 获取当前教师的权限
   */
  getMyGrades: async (): Promise<APIResponse<Grade[]>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: permissions, error } = await supabase
      .from('teacher_permissions')
      .select('*')
      .eq('teacher_id', user.id);

    if (error) throw error;

    // Convert permissions to grades (legacy format)
    // Note: The new system uses organizational permissions, but we maintain
    // backward compatibility with the Grade type
    const grades: Grade[] = [];

    for (const perm of (permissions || [])) {
      if (perm.permission_level === 'school') {
        // School-level = all grades (2021-2025)
        grades.push(2021, 2022, 2023, 2024, 2025);
        break;
      } else if (perm.permission_level === 'college' || perm.permission_level === 'major') {
        // Get enrollment years from classes
        const { data: classes } = await supabase
          .from('classes')
          .select('enrollment_year')
          .eq(perm.permission_level === 'college' ? 'college_id' : 'major_id',
              perm.permission_level === 'college' ? perm.college_id : perm.major_id);

        const years = [...new Set((classes || []).map(c => c.enrollment_year))];
        grades.push(...years.filter(y => !grades.includes(y)) as Grade[]);
      } else if (perm.permission_level === 'class' && perm.class_id) {
        // Get class enrollment year
        const { data: cls } = await supabase
          .from('classes')
          .select('enrollment_year')
          .eq('id', perm.class_id)
          .single();

        if (cls && !grades.includes(cls.enrollment_year)) {
          grades.push(cls.enrollment_year as Grade);
        }
      }
    }

    return formatResponse(grades);
  },

  /**
   * Get all teachers (Admin only)
   * 获取所有教师列表（仅管理员）
   */
  listTeachers: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<APIResponse<{ items: TeacherListItem[]; total: number }>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can list all teachers');
    }

    const skip = params?.skip || 0;
    const limit = params?.limit || 20;

    const { data: teachers, count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'teacher')
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get permissions for each teacher
    const teachersWithPermissions = await Promise.all(
      (teachers || []).map(async (teacher) => {
        const { data: permissions } = await supabase
          .from('teacher_permissions')
          .select('*')
          .eq('teacher_id', teacher.id);

        return {
          ...teacher,
          permissions: permissions || []
        } as TeacherListItem;
      })
    );

    return formatResponse({
      items: teachersWithPermissions,
      total: count || 0
    });
  },

  /**
   * Get specific teacher's info (Admin only)
   * 获取指定教师信息（仅管理员）
   */
  getTeacherGrades: async (teacherId: string): Promise<APIResponse<TeacherInfo>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can view teacher details');
    }

    const { data: teacher, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single();

    if (error) throw error;
    if (!teacher) throw new Error('Teacher not found');

    const { data: permissions } = await supabase
      .from('teacher_permissions')
      .select('*')
      .eq('teacher_id', teacherId);

    // Enrich permissions with organization names
    const enrichedPermissions = await Promise.all(
      (permissions || []).map(async (perm) => {
        let collegeName, majorName, className;

        if (perm.college_id) {
          const { data: college } = await supabase
            .from('colleges')
            .select('name')
            .eq('id', perm.college_id)
            .single();
          collegeName = college?.name;
        }

        if (perm.major_id) {
          const { data: major } = await supabase
            .from('majors')
            .select('name')
            .eq('id', perm.major_id)
            .single();
          majorName = major?.name;
        }

        if (perm.class_id) {
          const { data: cls } = await supabase
            .from('classes')
            .select('name')
            .eq('id', perm.class_id)
            .single();
          className = cls?.name;
        }

        return {
          ...perm,
          college_name: collegeName,
          major_name: majorName,
          class_name: className
        };
      })
    );

    return formatResponse({
      ...teacher,
      permissions: enrichedPermissions
    } as TeacherInfo);
  },

  /**
   * Assign grades/permissions to a teacher (Admin only)
   * 为教师分配权限（仅管理员）
   */
  assignGrades: async (
    teacherId: string,
    data: TeacherGradeAssign
  ): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can assign permissions');
    }

    // Convert legacy grade assignment to permission-based system
    // This maintains backward compatibility
    const permissionData = {
      teacher_id: teacherId,
      permission_level: data.permission_level || 'school',
      college_id: data.college_id || null,
      major_id: data.major_id || null,
      class_id: data.class_id || null
    };

    const { error } = await supabase
      .from('teacher_permissions')
      .insert(permissionData);

    if (error) throw error;

    return formatResponse({ message: 'Permission assigned successfully' });
  },

  /**
   * Remove a permission from teacher (Admin only)
   * 移除教师的权限（仅管理员）
   */
  removeGrade: async (
    teacherId: string,
    grade: Grade,
    _academicYear?: string
  ): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can remove permissions');
    }

    // In the new system, we remove all permissions for this teacher
    // that relate to the specified grade (enrollment year)
    // This is a simplified implementation - in production you might want
    // to be more specific about which permission to remove

    const { data: permissions } = await supabase
      .from('teacher_permissions')
      .select('id, class_id')
      .eq('teacher_id', teacherId);

    // Find permissions related to this grade
    for (const perm of (permissions || [])) {
      if (perm.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('enrollment_year')
          .eq('id', perm.class_id)
          .single();

        if (cls && cls.enrollment_year === grade) {
          await supabase
            .from('teacher_permissions')
            .delete()
            .eq('id', perm.id);
        }
      }
    }

    return formatResponse({ message: 'Permission removed successfully' });
  },
};
