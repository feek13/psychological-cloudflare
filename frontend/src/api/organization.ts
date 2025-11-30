/**
 * Organization API client
 * 组织架构 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser } from './supabase';
import type {
  OrganizationTree,
  College,
  Major,
  Class,
  StudentIdPreview,
  TeacherPermission,
  TeacherPermissionAssign
} from '@/types/organization';

/**
 * Get organization tree (for cascade selection)
 * 获取组织架构树（用于级联选择）
 */
export const getOrganizationTree = async (): Promise<OrganizationTree> => {
  // Fetch colleges
  const { data: colleges, error: collegesError } = await supabase
    .from('colleges')
    .select('*')
    .order('code');

  if (collegesError) throw collegesError;

  // Fetch majors
  const { data: majors, error: majorsError } = await supabase
    .from('majors')
    .select('*')
    .order('code');

  if (majorsError) throw majorsError;

  // Fetch classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .order('class_number');

  if (classesError) throw classesError;

  // Build tree structure
  const collegeMap = new Map<string, College & { majors: (Major & { classes: Class[] })[] }>();

  for (const college of (colleges || [])) {
    collegeMap.set(college.id, { ...college, majors: [] });
  }

  const majorMap = new Map<string, Major & { classes: Class[] }>();
  for (const major of (majors || [])) {
    const majorWithClasses = { ...major, classes: [] as Class[] };
    majorMap.set(major.id, majorWithClasses);

    const college = collegeMap.get(major.college_id);
    if (college) {
      college.majors.push(majorWithClasses);
    }
  }

  for (const cls of (classes || [])) {
    const major = majorMap.get(cls.major_id);
    if (major) {
      major.classes.push(cls);
    }
  }

  return {
    colleges: Array.from(collegeMap.values())
  };
};

/**
 * Get all colleges
 * 获取所有学院
 */
export const getColleges = async (includeMajors = false): Promise<College[]> => {
  const { data: colleges, error } = await supabase
    .from('colleges')
    .select('*')
    .order('code');

  if (error) throw error;

  if (!includeMajors) {
    return colleges || [];
  }

  // Include majors if requested
  const { data: majors, error: majorsError } = await supabase
    .from('majors')
    .select('*')
    .order('code');

  if (majorsError) throw majorsError;

  // Map majors to colleges
  const collegesWithMajors = (colleges || []).map(college => ({
    ...college,
    majors: (majors || []).filter(m => m.college_id === college.id)
  }));

  return collegesWithMajors;
};

/**
 * Get all majors
 * 获取所有专业
 */
export const getMajors = async (collegeId?: string): Promise<Major[]> => {
  let query = supabase
    .from('majors')
    .select('*')
    .order('code');

  if (collegeId) {
    query = query.eq('college_id', collegeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get all classes
 * 获取所有班级
 */
export const getClasses = async (majorId?: string, enrollmentYear?: number): Promise<Class[]> => {
  let query = supabase
    .from('classes')
    .select('*')
    .order('class_number');

  if (majorId) {
    query = query.eq('major_id', majorId);
  }

  if (enrollmentYear) {
    query = query.eq('enrollment_year', enrollmentYear);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Preview student ID
 * 预览学号
 *
 * Student ID Format: YYYYCCMMCNNN
 * - YYYY: Enrollment year (4 digits)
 * - CC: College code (2 digits)
 * - MM: Major code (2 digits)
 * - C: Class number (1 digit)
 * - NNN: Sequential number (3 digits)
 */
export const previewStudentId = async (
  collegeCode: string,
  majorCode: string,
  enrollmentYear: number,
  classNumber: number
): Promise<StudentIdPreview> => {
  // Build prefix for counting existing students
  const prefix = `${enrollmentYear}${collegeCode.padStart(2, '0')}${majorCode.padStart(2, '0')}${classNumber}`;

  // Count existing students with same prefix
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .like('student_id', `${prefix}%`);

  if (error) throw error;

  const nextNumber = (count || 0) + 1;
  const studentId = `${prefix}${String(nextNumber).padStart(3, '0')}`;

  return {
    student_id: studentId,
    next_number: nextNumber,
    format_description: `${enrollmentYear}年${collegeCode}学院${majorCode}专业${classNumber}班第${nextNumber}号`
  };
};

/**
 * Get teacher permissions
 * 获取教师权限
 */
export const getTeacherPermissions = async (teacherId?: string): Promise<TeacherPermission[]> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const targetTeacherId = teacherId || user.id;

  const { data: permissions, error } = await supabase
    .from('teacher_permissions')
    .select('*')
    .eq('teacher_id', targetTeacherId);

  if (error) throw error;

  // Enrich with organization info
  const enrichedPermissions = await Promise.all(
    (permissions || []).map(async (perm) => {
      // Map permission_level to permission_type for frontend compatibility
      const permissionType = perm.permission_level || perm.permission_type || 'school';

      const enriched: TeacherPermission = {
        ...perm,
        permission_type: permissionType,
        permission_level: permissionType,
        academic_year: perm.academic_year || '2024-2025',
        college_name: undefined,
        major_name: undefined,
        class_name: undefined,
        college_info: undefined,
        major_info: undefined,
        class_info: undefined
      };

      if (perm.college_id) {
        const { data: college } = await supabase
          .from('colleges')
          .select('*')
          .eq('id', perm.college_id)
          .single();
        enriched.college_name = college?.name;
        enriched.college_info = college || undefined;
      }

      if (perm.major_id) {
        const { data: major } = await supabase
          .from('majors')
          .select('*')
          .eq('id', perm.major_id)
          .single();
        enriched.major_name = major?.name;
        enriched.major_info = major || undefined;
      }

      if (perm.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('*')
          .eq('id', perm.class_id)
          .single();
        enriched.class_name = cls?.name;
        enriched.class_info = cls || undefined;
      }

      return enriched;
    })
  );

  return enrichedPermissions;
};

/**
 * Assign permissions to teacher (Admin only)
 * 为教师分配权限（仅管理员）
 */
export const assignTeacherPermissions = async (
  assignment: TeacherPermissionAssign
): Promise<TeacherPermission[]> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  if (profile?.role !== 'admin') {
    throw new Error('Only admins can assign permissions');
  }

  // Process each permission in the array
  let teacherId: string | null = null;

  for (const perm of assignment.permissions) {
    teacherId = perm.teacher_id;

    // Map permission_type to database fields
    const permissionData: any = {
      teacher_id: perm.teacher_id,
      permission_level: perm.permission_type, // Map to database field name
      academic_year: perm.academic_year || '2024-2025',
      college_id: null,
      major_id: null,
      class_id: null
    };

    // Map target_id to the appropriate field based on permission type
    if (perm.target_id) {
      switch (perm.permission_type) {
        case 'college':
          permissionData.college_id = perm.target_id;
          break;
        case 'major':
          permissionData.major_id = perm.target_id;
          break;
        case 'class':
          permissionData.class_id = perm.target_id;
          break;
        // 'school' doesn't need a target_id
      }
    }

    const { error: insertError } = await supabase
      .from('teacher_permissions')
      .insert(permissionData);

    if (insertError) throw insertError;
  }

  // Return updated permissions for the last teacher
  return teacherId ? getTeacherPermissions(teacherId) : [];
};

/**
 * Remove teacher permission (Admin only)
 * 移除教师权限（仅管理员）
 */
export const removeTeacherPermission = async (permissionId: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  if (profile?.role !== 'admin') {
    throw new Error('Only admins can remove permissions');
  }

  const { error } = await supabase
    .from('teacher_permissions')
    .delete()
    .eq('id', permissionId);

  if (error) throw error;
};

/**
 * Organization API collection
 * 组织架构 API 集合
 */
export const organizationAPI = {
  getOrganizationTree,
  getColleges,
  getMajors,
  getClasses,
  previewStudentId,
  getTeacherPermissions,
  assignTeacherPermissions,
  removeTeacherPermission
};
