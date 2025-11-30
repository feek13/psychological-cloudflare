/**
 * Scales API - Supabase Direct Access
 * Uses Supabase for database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import type {
  Scale,
  ScaleWithQuestions,
  ScaleStatistics,
  ScaleCreate,
  ScaleUpdate,
  Question,
} from '@/types/scale';

// Generic API response type
interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

// Helper to format API response
function formatResponse<T>(data: T | null, error: Error | null, message?: string): APIResponse<T> {
  if (error) {
    return {
      success: false,
      message: error.message,
      data: undefined as unknown as T,
    };
  }
  return {
    success: true,
    message: message || 'Success',
    data: data as T,
  };
}

export const scalesAPI = {
  /**
   * List all scales (with optional filters)
   */
  list: async (params?: {
    category?: string;
    is_active?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<APIResponse<{ items: Scale[]; total: number }>> => {
    try {
      let query = supabase
        .from('scales')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (params?.category) {
        query = query.eq('category', params.category);
      }
      if (params?.is_active !== undefined) {
        query = query.eq('is_active', params.is_active);
      }
      if (params?.search) {
        query = query.or(`name.ilike.%${params.search}%,code.ilike.%${params.search}%`);
      }

      // Pagination
      if (params?.skip !== undefined) {
        const limit = params?.limit || 20;
        query = query.range(params.skip, params.skip + limit - 1);
      } else if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return formatResponse({
        items: (data || []) as Scale[],
        total: count || 0,
      }, null);
    } catch (error) {
      console.error('List scales error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get a single scale by ID
   */
  get: async (id: string): Promise<APIResponse<Scale>> => {
    try {
      const { data, error } = await supabase
        .from('scales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return formatResponse(data as Scale, null);
    } catch (error) {
      console.error('Get scale error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get scale with all questions
   */
  getWithQuestions: async (id: string): Promise<APIResponse<ScaleWithQuestions>> => {
    try {
      // Get scale
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('*')
        .eq('id', id)
        .single();

      if (scaleError) throw scaleError;

      // Get questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('scale_id', id)
        .order('order_num');

      if (questionsError) throw questionsError;

      const result: ScaleWithQuestions = {
        ...(scale as Scale),
        questions: (questions || []) as Question[],
      };

      return formatResponse(result, null);
    } catch (error) {
      console.error('Get scale with questions error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get questions for a scale
   */
  getQuestions: async (id: string): Promise<APIResponse<{ questions: Question[]; total: number }>> => {
    try {
      const { data, error, count } = await supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .eq('scale_id', id)
        .order('order_num');

      if (error) throw error;

      return formatResponse({
        questions: (data || []) as Question[],
        total: count || 0,
      }, null);
    } catch (error) {
      console.error('Get questions error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Create a new scale (Teacher/Admin only)
   */
  create: async (data: ScaleCreate): Promise<APIResponse<Scale>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Check if user is teacher
      const profile = await getUserProfile(user.id);
      if (profile.role !== 'teacher' && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限创建量表'));
      }

      const { questions, ...scaleData } = data;

      // Create scale
      const { data: newScale, error: scaleError } = await supabase
        .from('scales')
        .insert({
          ...scaleData,
          created_by: user.id,
        })
        .select()
        .single();

      if (scaleError) throw scaleError;

      // Create questions if provided
      if (questions && questions.length > 0) {
        const questionsWithScaleId = questions.map((q, index) => ({
          ...q,
          scale_id: newScale.id,
          order_num: q.order_num ?? index + 1,
          reverse_scored: q.reverse_scored ?? false,
          weight: q.weight ?? 1,
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsWithScaleId);

        if (questionsError) {
          // Rollback: delete the scale if questions failed
          await supabase.from('scales').delete().eq('id', newScale.id);
          throw questionsError;
        }
      }

      return formatResponse(newScale as Scale, null, '量表创建成功');
    } catch (error) {
      console.error('Create scale error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Update a scale (Teacher/Admin only)
   */
  update: async (id: string, data: ScaleUpdate): Promise<APIResponse<Scale>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Check ownership or admin
      const { data: existingScale, error: fetchError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const profile = await getUserProfile(user.id);
      if (existingScale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限修改此量表'));
      }

      const { data: updatedScale, error } = await supabase
        .from('scales')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return formatResponse(updatedScale as Scale, null, '量表更新成功');
    } catch (error) {
      console.error('Update scale error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Delete a scale (Teacher/Admin only)
   */
  delete: async (id: string): Promise<APIResponse<void>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Check ownership or admin
      const { data: existingScale, error: fetchError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const profile = await getUserProfile(user.id);
      if (existingScale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限删除此量表'));
      }

      // Delete questions first (cascade)
      await supabase.from('questions').delete().eq('scale_id', id);

      // Delete scale
      const { error } = await supabase
        .from('scales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return formatResponse(undefined, null, '量表删除成功');
    } catch (error) {
      console.error('Delete scale error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get published scales available to current student
   * Filters by student's organization (college, major, class)
   */
  listPublished: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<APIResponse<{ items: Scale[]; total: number }>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get student's profile for organization info
      const profile = await getUserProfile(user.id);

      // Get all active publications
      const { data: publications, error: pubError } = await supabase
        .from('scale_publications')
        .select('scale_id, visibility_type, target_college_id, target_major_id, target_class_id')
        .eq('is_active', true);

      if (pubError) throw pubError;

      // Filter publications based on student's organization
      const visibleScaleIds = (publications || [])
        .filter(pub => {
          switch (pub.visibility_type) {
            case 'all':
              return true;
            case 'college':
              return pub.target_college_id === profile.college_id;
            case 'major':
              return pub.target_major_id === profile.major_id;
            case 'class':
              return pub.target_class_id === profile.class_id;
            default:
              return false;
          }
        })
        .map(pub => pub.scale_id);

      if (visibleScaleIds.length === 0) {
        return formatResponse({ items: [], total: 0 }, null);
      }

      // Get scales
      let query = supabase
        .from('scales')
        .select('*', { count: 'exact' })
        .in('id', visibleScaleIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Pagination
      if (params?.skip !== undefined) {
        const limit = params?.limit || 20;
        query = query.range(params.skip, params.skip + limit - 1);
      } else if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return formatResponse({
        items: (data || []) as Scale[],
        total: count || 0,
      }, null);
    } catch (error) {
      console.error('List published scales error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get statistics for a specific scale (Teacher only)
   */
  getStatistics: async (id: string): Promise<APIResponse<ScaleStatistics>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Verify user is teacher
      const profile = await getUserProfile(user.id);
      if (profile.role !== 'teacher' && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限查看统计信息'));
      }

      // Get scale info
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('id, name, code')
        .eq('id', id)
        .single();

      if (scaleError) throw scaleError;

      // Get assessments for this scale
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('status, raw_scores, started_at, completed_at')
        .eq('scale_id', id);

      if (assessmentsError) throw assessmentsError;

      const completed = assessments?.filter(a => a.status === 'completed') || [];
      const inProgress = assessments?.filter(a => a.status === 'in_progress') || [];

      // Calculate scores
      const scores = completed
        .map(a => (a.raw_scores as { total_mean?: number })?.total_mean)
        .filter((s): s is number => s !== undefined && s !== null);

      // Calculate average completion time (in minutes)
      const completionTimes = completed
        .filter(a => a.started_at && a.completed_at)
        .map(a => {
          const start = new Date(a.started_at).getTime();
          const end = new Date(a.completed_at).getTime();
          return (end - start) / 60000; // Convert to minutes
        });

      const stats: ScaleStatistics = {
        scale_id: scale.id,
        scale_name: scale.name,
        scale_code: scale.code,
        total_assessments: assessments?.length || 0,
        completed_assessments: completed.length,
        in_progress_assessments: inProgress.length,
        completion_rate: assessments?.length
          ? (completed.length / assessments.length) * 100
          : 0,
        avg_score: scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null,
        min_score: scores.length > 0 ? Math.min(...scores) : null,
        max_score: scores.length > 0 ? Math.max(...scores) : null,
        avg_completion_time: completionTimes.length > 0
          ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
          : null,
      };

      return formatResponse(stats, null);
    } catch (error) {
      console.error('Get statistics error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Add a question to a scale (Teacher only)
   */
  addQuestion: async (scaleId: string, question: {
    content: string;
    dimension?: string;
    options: { value: number; label: string }[];
    order_num?: number;
    reverse_scored?: boolean;
    weight?: number;
  }): Promise<APIResponse<Question>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Verify ownership
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', scaleId)
        .single();

      if (scaleError) throw scaleError;

      const profile = await getUserProfile(user.id);
      if (scale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限修改此量表'));
      }

      // Get max order_num if not provided
      let orderNum = question.order_num;
      if (!orderNum) {
        const { data: maxOrder } = await supabase
          .from('questions')
          .select('order_num')
          .eq('scale_id', scaleId)
          .order('order_num', { ascending: false })
          .limit(1)
          .single();

        orderNum = (maxOrder?.order_num || 0) + 1;
      }

      const { data, error } = await supabase
        .from('questions')
        .insert({
          scale_id: scaleId,
          content: question.content,
          dimension: question.dimension,
          options: question.options,
          order_num: orderNum,
          reverse_scored: question.reverse_scored ?? false,
          weight: question.weight ?? 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Update total_questions count
      await supabase.rpc('increment_total_questions', { scale_id: scaleId });

      return formatResponse(data as Question, null, '题目添加成功');
    } catch (error) {
      console.error('Add question error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Update a question (Teacher only)
   */
  updateQuestion: async (questionId: string, data: {
    content?: string;
    dimension?: string;
    options?: { value: number; label: string }[];
    order_num?: number;
    reverse_scored?: boolean;
    weight?: number;
  }): Promise<APIResponse<Question>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get question's scale
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('scale_id')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;

      // Verify ownership
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', question.scale_id)
        .single();

      if (scaleError) throw scaleError;

      const profile = await getUserProfile(user.id);
      if (scale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限修改此题目'));
      }

      const { data: updated, error } = await supabase
        .from('questions')
        .update(data)
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;
      return formatResponse(updated as Question, null, '题目更新成功');
    } catch (error) {
      console.error('Update question error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Delete a question (Teacher only)
   */
  deleteQuestion: async (questionId: string): Promise<APIResponse<void>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get question's scale
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('scale_id')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;

      // Verify ownership
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', question.scale_id)
        .single();

      if (scaleError) throw scaleError;

      const profile = await getUserProfile(user.id);
      if (scale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限删除此题目'));
      }

      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      // Update total_questions count
      await supabase.rpc('decrement_total_questions', { scale_id: question.scale_id });

      return formatResponse(undefined, null, '题目删除成功');
    } catch (error) {
      console.error('Delete question error:', error);
      return formatResponse(null, error as Error);
    }
  },
};

export default scalesAPI;
