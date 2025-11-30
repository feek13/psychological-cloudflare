/**
 * Students API client
 * 学生管理 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import type {
  APIResponse,
  StudentListItem,
  StudentDetail,
  StudentReportItem,
  StudentStatistics,
  GradeStatistics,
  StudentFilters,
  PaginatedResponse,
} from '@/types';

// Helper to format response
const formatResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data
});

/**
 * Build permission filter for teachers
 * 根据教师权限构建查询过滤条件
 */
const buildPermissionFilter = async (userId: string) => {
  // Get teacher's permissions
  const { data: permissions, error } = await supabase
    .from('teacher_permissions')
    .select('*')
    .eq('teacher_id', userId);

  if (error) throw error;

  if (!permissions || permissions.length === 0) {
    // No permissions = can see no students
    return { hasAccess: false, filter: null };
  }

  // Check for school-level permission
  const hasSchoolPermission = permissions.some(p => p.permission_level === 'school');
  if (hasSchoolPermission) {
    return { hasAccess: true, filter: null }; // Can see all students
  }

  // Build filter based on permissions
  const collegeIds = permissions
    .filter(p => p.permission_level === 'college' && p.college_id)
    .map(p => p.college_id);

  const majorIds = permissions
    .filter(p => p.permission_level === 'major' && p.major_id)
    .map(p => p.major_id);

  const classIds = permissions
    .filter(p => p.permission_level === 'class' && p.class_id)
    .map(p => p.class_id);

  return {
    hasAccess: true,
    filter: { collegeIds, majorIds, classIds }
  };
};

export const studentsAPI = {
  /**
   * List students in teacher's assigned organization
   * 列出教师负责组织的学生
   */
  list: async (
    params?: StudentFilters
  ): Promise<APIResponse<PaginatedResponse<StudentListItem>>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error('Only teachers and admins can list students');
    }

    // Build permission filter
    const { hasAccess, filter } = await buildPermissionFilter(user.id);

    if (!hasAccess) {
      return formatResponse({ items: [], total: 0 });
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'student');

    // Apply permission filters
    if (filter) {
      if (filter.classIds.length > 0) {
        query = query.in('class_id', filter.classIds);
      } else if (filter.majorIds.length > 0) {
        query = query.in('major_id', filter.majorIds);
      } else if (filter.collegeIds.length > 0) {
        query = query.in('college_id', filter.collegeIds);
      }
    }

    // Apply additional filters
    if (params?.college_id) {
      query = query.eq('college_id', params.college_id);
    }
    if (params?.major_id) {
      query = query.eq('major_id', params.major_id);
    }
    if (params?.class_id) {
      query = query.eq('class_id', params.class_id);
    }
    if (params?.search) {
      query = query.or(`full_name.ilike.%${params.search}%,student_id.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    // Pagination
    const skip = params?.skip || 0;
    const limit = params?.limit || 20;
    query = query.range(skip, skip + limit - 1);
    query = query.order('created_at', { ascending: false });

    const { data: students, count, error } = await query;
    if (error) throw error;

    // Enrich with organization names
    const enrichedStudents = await enrichStudentsWithOrgNames(students || []);

    // Calculate average score for each student
    const studentsWithScores = await Promise.all(
      enrichedStudents.map(async (student) => {
        const { data: assessments } = await supabase
          .from('assessments')
          .select('raw_scores')
          .eq('user_id', student.id)
          .eq('status', 'completed');

        let avgScore: number | null = null;
        if (assessments && assessments.length > 0) {
          const scores = assessments
            .filter(a => a.raw_scores?.total !== undefined)
            .map(a => a.raw_scores.total);
          if (scores.length > 0) {
            avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          }
        }

        return {
          ...student,
          avg_score: avgScore
        };
      })
    );

    return formatResponse({
      items: studentsWithScores as StudentListItem[],
      total: count || 0
    });
  },

  /**
   * Get student detail
   * 获取学生详情
   */
  getDetail: async (studentId: string): Promise<APIResponse<StudentDetail>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: student, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error) throw error;
    if (!student) throw new Error('Student not found');

    // Enrich with organization names
    const [enriched] = await enrichStudentsWithOrgNames([student]);

    // Get assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    return formatResponse({
      ...enriched,
      assessments: assessments || []
    } as StudentDetail);
  },

  /**
   * Get student's assessment reports (only for scales published by current teacher)
   * 获取学生的测评报告（仅限当前教师发布的量表）
   */
  getReports: async (studentId: string): Promise<APIResponse<StudentReportItem[]>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get teacher's published scales
    const { data: publications } = await supabase
      .from('scale_publications')
      .select('scale_id')
      .eq('published_by', user.id)
      .eq('is_active', true);

    const publishedScaleIds = (publications || []).map(p => p.scale_id);

    if (publishedScaleIds.length === 0) {
      return formatResponse([]);
    }

    // Get completed assessments for those scales
    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .in('scale_id', publishedScaleIds)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Get scale names
    const scaleIds = [...new Set((assessments || []).map(a => a.scale_id))];
    const { data: scales } = await supabase
      .from('scales')
      .select('id, name, code')
      .in('id', scaleIds);

    const scaleMap = new Map((scales || []).map(s => [s.id, s]));

    // Format reports
    const reports: StudentReportItem[] = (assessments || []).map(assessment => ({
      id: assessment.id,
      scale_id: assessment.scale_id,
      scale_name: scaleMap.get(assessment.scale_id)?.name || 'Unknown',
      scale_code: scaleMap.get(assessment.scale_id)?.code || '',
      completed_at: assessment.completed_at,
      raw_scores: assessment.raw_scores,
      metadata: assessment.metadata
    }));

    return formatResponse(reports);
  },

  /**
   * Get students statistics overview
   * 获取学生统计概览
   */
  getOverview: async (): Promise<APIResponse<StudentStatistics>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { hasAccess, filter } = await buildPermissionFilter(user.id);

    if (!hasAccess) {
      return formatResponse({
        total_students: 0,
        total_assessments: 0,
        completed_assessments: 0,
        in_progress_assessments: 0,
        completion_rate: 0
      });
    }

    // Build student query based on permissions
    let studentQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'student');

    if (filter) {
      if (filter.classIds.length > 0) {
        studentQuery = studentQuery.in('class_id', filter.classIds);
      } else if (filter.majorIds.length > 0) {
        studentQuery = studentQuery.in('major_id', filter.majorIds);
      } else if (filter.collegeIds.length > 0) {
        studentQuery = studentQuery.in('college_id', filter.collegeIds);
      }
    }

    const { count: totalStudents } = await studentQuery;

    // Get student IDs for assessment queries
    const { data: studentProfiles } = await studentQuery;
    const studentIds = (studentProfiles || []).map(s => s.id);

    if (studentIds.length === 0) {
      return formatResponse({
        total_students: 0,
        total_assessments: 0,
        completed_assessments: 0,
        in_progress_assessments: 0,
        completion_rate: 0
      });
    }

    // Get assessment counts
    const { count: totalAssessments } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .in('user_id', studentIds);

    const { count: completedAssessments } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .in('user_id', studentIds)
      .eq('status', 'completed');

    const { count: inProgressAssessments } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .in('user_id', studentIds)
      .eq('status', 'in_progress');

    const total = totalAssessments || 0;
    const completed = completedAssessments || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return formatResponse({
      total_students: totalStudents || 0,
      total_assessments: total,
      completed_assessments: completed,
      in_progress_assessments: inProgressAssessments || 0,
      completion_rate: Math.round(completionRate * 100) / 100
    });
  },

  /**
   * Get detailed statistics by grade/organization
   * 获取按组织的详细统计
   */
  getGradeStatistics: async (): Promise<APIResponse<GradeStatistics[]>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { hasAccess, filter } = await buildPermissionFilter(user.id);

    if (!hasAccess) {
      return formatResponse([]);
    }

    // Get colleges
    const { data: colleges } = await supabase
      .from('colleges')
      .select('*')
      .order('code');

    const stats: GradeStatistics[] = [];

    for (const college of (colleges || [])) {
      // Check if teacher has access to this college
      if (filter && !filter.collegeIds.includes(college.id)) {
        continue;
      }

      // Count students in this college
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('college_id', college.id);

      // Get student IDs
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('college_id', college.id);

      const studentIds = (studentProfiles || []).map(s => s.id);

      let completedCount = 0;
      if (studentIds.length > 0) {
        const { count } = await supabase
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .in('user_id', studentIds)
          .eq('status', 'completed');
        completedCount = count || 0;
      }

      stats.push({
        grade: college.name,
        student_count: studentCount || 0,
        completed_count: completedCount,
        completion_rate: studentCount ? Math.round((completedCount / (studentCount || 1)) * 100) / 100 : 0
      });
    }

    return formatResponse(stats);
  },
};

/**
 * Helper: Enrich students with organization names
 */
async function enrichStudentsWithOrgNames(students: any[]): Promise<any[]> {
  if (students.length === 0) return [];

  const collegeIds = [...new Set(students.map(s => s.college_id).filter(Boolean))];
  const majorIds = [...new Set(students.map(s => s.major_id).filter(Boolean))];
  const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];

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

  return students.map(student => ({
    ...student,
    college_name: collegeMap.get(student.college_id),
    major_name: majorMap.get(student.major_id),
    class_name: classMap.get(student.class_id)
  }));
}
