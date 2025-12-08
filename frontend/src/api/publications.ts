/**
 * Publications API client
 * 量表发布管理 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import { formatSuccess as formatResponse } from './utils';
import type {
  APIResponse,
  PublicationCreate,
  PublicationUpdate,
  PublicationDetail,
  PublicationListItem,
  PublicationFilters,
  PaginatedResponse,
} from '@/types';

export const publicationsAPI = {
  /**
   * Publish a scale
   * 发布量表
   */
  create: async (data: PublicationCreate): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error('Only teachers and admins can publish scales');
    }

    // Build publication record
    const publicationData = {
      scale_id: data.scale_id,
      published_by: user.id,
      visibility_type: data.visibility_type || 'all',
      target_college_id: data.target_college_id || null,
      target_major_id: data.target_major_id || null,
      target_class_id: data.target_class_id || null,
      target_grades: data.target_grades || null,
      target_classes: data.target_classes || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('scale_publications')
      .insert(publicationData);

    if (error) throw error;

    return formatResponse({ message: 'Scale published successfully' });
  },

  /**
   * List current teacher's publications
   * 列出当前教师的发布记录
   */
  list: async (
    params?: PublicationFilters
  ): Promise<APIResponse<PaginatedResponse<PublicationListItem>>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error('Only teachers and admins can view publications');
    }

    let query = supabase
      .from('scale_publications')
      .select('*', { count: 'exact' })
      .eq('published_by', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }
    if (params?.scale_id) {
      query = query.eq('scale_id', params.scale_id);
    }

    // Pagination
    const skip = params?.skip || 0;
    const limit = params?.limit || 20;
    query = query.range(skip, skip + limit - 1);

    const { data: publications, count, error } = await query;
    if (error) throw error;

    // Enrich with scale names and statistics
    const enrichedPublications = await enrichPublicationsWithDetails(publications || []);

    return formatResponse({
      items: enrichedPublications,
      total: count || 0
    });
  },

  /**
   * Get publication detail with statistics
   * 获取发布详情及统计数据
   */
  getDetail: async (publicationId: string): Promise<APIResponse<PublicationDetail>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: publication, error } = await supabase
      .from('scale_publications')
      .select('*')
      .eq('id', publicationId)
      .maybeSingle();

    if (error) throw error;
    if (!publication) throw new Error('Publication not found');

    // Check ownership
    if (publication.published_by !== user.id) {
      const profile = await getUserProfile();
      if (profile?.role !== 'admin') {
        throw new Error('Not authorized to view this publication');
      }
    }

    // Get scale details
    const { data: scale } = await supabase
      .from('scales')
      .select('id, name, code, description')
      .eq('id', publication.scale_id)
      .maybeSingle();

    // Get statistics
    const stats = await getPublicationStatistics(publication);

    // Get organization names
    let collegeName, majorName, className;
    if (publication.target_college_id) {
      const { data: college } = await supabase
        .from('colleges')
        .select('name')
        .eq('id', publication.target_college_id)
        .maybeSingle();
      collegeName = college?.name;
    }
    if (publication.target_major_id) {
      const { data: major } = await supabase
        .from('majors')
        .select('name')
        .eq('id', publication.target_major_id)
        .maybeSingle();
      majorName = major?.name;
    }
    if (publication.target_class_id) {
      const { data: cls } = await supabase
        .from('classes')
        .select('name')
        .eq('id', publication.target_class_id)
        .maybeSingle();
      className = cls?.name;
    }

    return formatResponse({
      ...publication,
      scale,
      target_college_name: collegeName,
      target_major_name: majorName,
      target_class_name: className,
      ...stats
    } as PublicationDetail);
  },

  /**
   * Update publication settings
   * 更新发布设置
   */
  update: async (
    publicationId: string,
    data: PublicationUpdate
  ): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Check ownership
    const { data: publication, error: fetchError } = await supabase
      .from('scale_publications')
      .select('published_by')
      .eq('id', publicationId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!publication) throw new Error('Publication not found');

    if (publication.published_by !== user.id) {
      const profile = await getUserProfile();
      if (profile?.role !== 'admin') {
        throw new Error('Not authorized to update this publication');
      }
    }

    // Update publication
    const updateData: any = {};
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.visibility_type) updateData.visibility_type = data.visibility_type;
    if (data.target_college_id !== undefined) updateData.target_college_id = data.target_college_id;
    if (data.target_major_id !== undefined) updateData.target_major_id = data.target_major_id;
    if (data.target_class_id !== undefined) updateData.target_class_id = data.target_class_id;

    const { error } = await supabase
      .from('scale_publications')
      .update(updateData)
      .eq('id', publicationId);

    if (error) throw error;

    return formatResponse({ message: 'Publication updated successfully' });
  },

  /**
   * Unpublish a scale (soft delete)
   * 取消发布量表（软删除）
   */
  delete: async (publicationId: string): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Check ownership
    const { data: publication, error: fetchError } = await supabase
      .from('scale_publications')
      .select('published_by')
      .eq('id', publicationId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!publication) throw new Error('Publication not found');

    if (publication.published_by !== user.id) {
      const profile = await getUserProfile();
      if (profile?.role !== 'admin') {
        throw new Error('Not authorized to delete this publication');
      }
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('scale_publications')
      .update({ is_active: false })
      .eq('id', publicationId);

    if (error) throw error;

    return formatResponse({ message: 'Publication deactivated successfully' });
  },

  /**
   * Get publication statistics
   * 获取发布统计数据
   */
  getStatistics: async (publicationId: string): Promise<APIResponse<PublicationDetail>> => {
    // Reuse getDetail which includes statistics
    return publicationsAPI.getDetail(publicationId);
  },
};

/**
 * Helper: Get publication statistics
 */
async function getPublicationStatistics(publication: any) {
  // Get target student count based on visibility
  let targetStudentQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('role', 'student');

  if (publication.visibility_type === 'college' && publication.target_college_id) {
    targetStudentQuery = targetStudentQuery.eq('college_id', publication.target_college_id);
  } else if (publication.visibility_type === 'major' && publication.target_major_id) {
    targetStudentQuery = targetStudentQuery.eq('major_id', publication.target_major_id);
  } else if (publication.visibility_type === 'class' && publication.target_class_id) {
    targetStudentQuery = targetStudentQuery.eq('class_id', publication.target_class_id);
  }

  const { count: targetCount } = await targetStudentQuery;
  const { data: targetStudents } = await targetStudentQuery;
  const studentIds = (targetStudents || []).map(s => s.id);

  // Get assessment statistics
  let completedCount = 0;
  let inProgressCount = 0;

  if (studentIds.length > 0) {
    const { count: completed } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('scale_id', publication.scale_id)
      .in('user_id', studentIds)
      .eq('status', 'completed');
    completedCount = completed || 0;

    const { count: inProgress } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true })
      .eq('scale_id', publication.scale_id)
      .in('user_id', studentIds)
      .eq('status', 'in_progress');
    inProgressCount = inProgress || 0;
  }

  const total = targetCount || 0;
  const completionRate = total > 0 ? (completedCount / total) * 100 : 0;

  return {
    target_student_count: total,
    completed_count: completedCount,
    in_progress_count: inProgressCount,
    completion_rate: Math.round(completionRate * 100) / 100
  };
}

/**
 * Helper: Enrich publications with scale names and basic statistics
 */
async function enrichPublicationsWithDetails(publications: any[]): Promise<PublicationListItem[]> {
  if (publications.length === 0) return [];

  // Get scale details
  const scaleIds = [...new Set(publications.map(p => p.scale_id))];
  const { data: scales } = await supabase
    .from('scales')
    .select('id, name, code')
    .in('id', scaleIds);

  const scaleMap = new Map((scales || []).map(s => [s.id, s]));

  // Enrich publications
  return Promise.all(
    publications.map(async (pub) => {
      const scale = scaleMap.get(pub.scale_id);
      const stats = await getPublicationStatistics(pub);

      // Get organization names
      let collegeName, majorName, className;
      if (pub.target_college_id) {
        const { data: college } = await supabase
          .from('colleges')
          .select('name')
          .eq('id', pub.target_college_id)
          .maybeSingle();
        collegeName = college?.name;
      }
      if (pub.target_major_id) {
        const { data: major } = await supabase
          .from('majors')
          .select('name')
          .eq('id', pub.target_major_id)
          .maybeSingle();
        majorName = major?.name;
      }
      if (pub.target_class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('name')
          .eq('id', pub.target_class_id)
          .maybeSingle();
        className = cls?.name;
      }

      return {
        ...pub,
        scale_name: scale?.name || 'Unknown',
        scale_code: scale?.code || '',
        target_college_name: collegeName,
        target_major_name: majorName,
        target_class_name: className,
        ...stats
      };
    })
  );
}
