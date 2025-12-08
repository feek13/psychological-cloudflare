/**
 * Students API client
 * 学生管理 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import { formatSuccess as formatResponse } from './utils';
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

/**
 * Build permission filter for teachers
 * 根据教师权限构建查询过滤条件
 */
const buildPermissionFilter = async (userId: string) => {
  // Check user role first - admin has all permissions
  const profile = await getUserProfile();
  if (profile?.role === 'admin') {
    return { hasAccess: true, filter: null }; // Admin can see all students
  }

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

    // RLS policies now allow teachers/admins to read assessments directly
    const assessmentClient = supabase;

    // Calculate average score for each student
    const studentsWithScores = await Promise.all(
      enrichedStudents.map(async (student) => {
        const { data: assessments } = await assessmentClient
          .from('assessments')
          .select('raw_scores')
          .eq('user_id', student.id)
          .eq('status', 'completed');

        let avgScore: number | null = null;
        if (assessments && assessments.length > 0) {
          const scores = assessments
            .filter(a => a.raw_scores?.total_score !== undefined || a.raw_scores?.final_score !== undefined)
            .map(a => a.raw_scores.total_score ?? a.raw_scores.final_score);
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
      .maybeSingle();

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

    // RLS policies now allow teachers/admins to read assessments directly
    const client = supabase;

    // Get teacher's published scales
    const { data: publications } = await client
      .from('scale_publications')
      .select('scale_id')
      .eq('published_by', user.id)
      .eq('is_active', true);

    const publishedScaleIds = (publications || []).map(p => p.scale_id);

    if (publishedScaleIds.length === 0) {
      return formatResponse([]);
    }

    // Get completed assessments for those scales
    const { data: assessments, error } = await client
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
        completion_rate: 0,
        class_count: 0
      });
    }

    // RLS policies now allow teachers/admins to read assessments directly
    // No need for admin client - use regular supabase client
    const client = supabase;

    // Build student query based on permissions
    let studentQuery = client
      .from('profiles')
      .select('id, class_id', { count: 'exact' })
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

    const { count: totalStudents, data: studentProfiles } = await studentQuery;

    // Count unique classes
    const uniqueClassIds = new Set(
      (studentProfiles || [])
        .map(s => s.class_id)
        .filter(Boolean)
    );
    const classCount = uniqueClassIds.size;

    const studentIds = (studentProfiles || []).map(s => s.id);

    if (studentIds.length === 0) {
      return formatResponse({
        total_students: 0,
        total_assessments: 0,
        completed_assessments: 0,
        in_progress_assessments: 0,
        completion_rate: 0,
        class_count: classCount
      });
    }

    // Batch size to avoid URL too long errors (each UUID is ~36 chars)
    const BATCH_SIZE = 30;

    // Split studentIds into batches
    const batches: string[][] = [];
    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      batches.push(studentIds.slice(i, i + BATCH_SIZE));
    }

    // Process batches and aggregate assessment counts
    let totalAssessmentsCount = 0;
    let completedAssessmentsCount = 0;
    let inProgressAssessmentsCount = 0;

    for (const batch of batches) {
      const { count: batchTotal } = await client
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .in('user_id', batch);

      const { count: batchCompleted } = await client
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .in('user_id', batch)
        .eq('status', 'completed');

      const { count: batchInProgress } = await client
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .in('user_id', batch)
        .eq('status', 'in_progress');

      totalAssessmentsCount += batchTotal || 0;
      completedAssessmentsCount += batchCompleted || 0;
      inProgressAssessmentsCount += batchInProgress || 0;
    }

    const total = totalAssessmentsCount;
    const completed = completedAssessmentsCount;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return formatResponse({
      total_students: totalStudents || 0,
      total_assessments: total,
      completed_assessments: completed,
      in_progress_assessments: inProgressAssessmentsCount,
      completion_rate: Math.round(completionRate * 100) / 100,
      class_count: classCount
    });
  },

  /**
   * Get detailed statistics by grade/organization
   * 获取按组织的详细统计（包含平均分、分数范围）
   */
  getGradeStatistics: async (): Promise<APIResponse<GradeStatistics[]>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { hasAccess, filter } = await buildPermissionFilter(user.id);

    if (!hasAccess) {
      return formatResponse([]);
    }

    // RLS policies now allow teachers/admins to read assessments directly
    // No need for admin client - use regular supabase client
    const client = supabase;

    // Check if user is admin or has school-level permission
    const profile = await getUserProfile();
    const isAdmin = profile?.role === 'admin';

    // Get teacher's permissions to determine grouping level
    const { data: permissions } = await supabase
      .from('teacher_permissions')
      .select('*')
      .eq('teacher_id', user.id);

    const hasSchoolPermission = isAdmin || permissions?.some(p => p.permission_level === 'school');
    const stats: GradeStatistics[] = [];

    // Helper function to calculate stats for a group of students
    // Uses batching to avoid URL too long errors when there are many students
    const calculateGroupStats = async (
      groupName: string,
      level: 'college' | 'major' | 'class',
      studentIds: string[]
    ): Promise<GradeStatistics> => {
      if (studentIds.length === 0) {
        return {
          grade: groupName,
          level,
          total_students: 0,
          total_assessments: 0,
          completed_assessments: 0,
          completion_rate: 0,
          avg_score: null,
          min_score: null,
          max_score: null
        };
      }

      // Batch size to avoid URL too long errors (each UUID is ~36 chars)
      const BATCH_SIZE = 30;

      // Split studentIds into batches
      const batches: string[][] = [];
      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        batches.push(studentIds.slice(i, i + BATCH_SIZE));
      }

      // Process batches and aggregate results
      let totalAssessments = 0;
      let completedAssessments = 0;
      const allScores: number[] = [];

      for (const batch of batches) {
        // Get assessment counts for this batch
        const { count: batchTotal } = await client
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .in('user_id', batch);

        const { count: batchCompleted } = await client
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .in('user_id', batch)
          .eq('status', 'completed');

        totalAssessments += batchTotal || 0;
        completedAssessments += batchCompleted || 0;

        // Get completed assessments with scores for this batch
        const { data: batchAssessments } = await client
          .from('assessments')
          .select('raw_scores')
          .in('user_id', batch)
          .eq('status', 'completed');

        // Collect scores from this batch
        const batchScores = (batchAssessments || [])
          .map(a => a.raw_scores?.total_score ?? a.raw_scores?.final_score)
          .filter((s): s is number => typeof s === 'number');

        allScores.push(...batchScores);
      }

      // Calculate score statistics from all batches
      const avgScore = allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
        : null;
      const minScore = allScores.length > 0 ? Math.min(...allScores) : null;
      const maxScore = allScores.length > 0 ? Math.max(...allScores) : null;

      const completionRate = totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100 * 100) / 100 : 0;

      return {
        grade: groupName,
        level,
        total_students: studentIds.length,
        total_assessments: totalAssessments,
        completed_assessments: completedAssessments,
        completion_rate: completionRate,
        avg_score: avgScore,
        min_score: minScore,
        max_score: maxScore
      };
    };

    if (hasSchoolPermission || !filter) {
      // School-level: Group by colleges
      const { data: colleges } = await client
        .from('colleges')
        .select('id, name')
        .order('code');

      for (const college of (colleges || [])) {
        const { data: studentProfiles } = await client
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('college_id', college.id);

        const studentIds = (studentProfiles || []).map(s => s.id);
        const stat = await calculateGroupStats(college.name, 'college', studentIds);
        if (stat.total_students > 0) {
          stats.push(stat);
        }
      }
    } else if (filter.collegeIds.length > 0) {
      // College-level: Group by majors in those colleges
      const { data: majors } = await client
        .from('majors')
        .select('id, name')
        .in('college_id', filter.collegeIds)
        .order('code');

      for (const major of (majors || [])) {
        const { data: studentProfiles } = await client
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('major_id', major.id);

        const studentIds = (studentProfiles || []).map(s => s.id);
        const stat = await calculateGroupStats(major.name, 'major', studentIds);
        if (stat.total_students > 0) {
          stats.push(stat);
        }
      }
    } else if (filter.majorIds.length > 0) {
      // Major-level: Group by classes in those majors
      const { data: classes } = await client
        .from('classes')
        .select('id, name')
        .in('major_id', filter.majorIds)
        .order('name');

      for (const cls of (classes || [])) {
        const { data: studentProfiles } = await client
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('class_id', cls.id);

        const studentIds = (studentProfiles || []).map(s => s.id);
        const stat = await calculateGroupStats(cls.name, 'class', studentIds);
        if (stat.total_students > 0) {
          stats.push(stat);
        }
      }
    } else if (filter.classIds.length > 0) {
      // Class-level: Show each class directly
      const { data: classes } = await client
        .from('classes')
        .select('id, name')
        .in('id', filter.classIds)
        .order('name');

      for (const cls of (classes || [])) {
        const { data: studentProfiles } = await client
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('class_id', cls.id);

        const studentIds = (studentProfiles || []).map(s => s.id);
        const stat = await calculateGroupStats(cls.name, 'class', studentIds);
        if (stat.total_students > 0) {
          stats.push(stat);
        }
      }
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
