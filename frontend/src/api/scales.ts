/**
 * Scales API - Supabase Direct Access
 * Uses Supabase for database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import { formatResponse } from './utils';
import type { APIResponse } from '@/types';
import type {
  Scale,
  ScaleWithQuestions,
  ScaleStatistics,
  ScaleCreate,
  ScaleUpdate,
  Question,
} from '@/types/scale';

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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return formatResponse(null, new Error('量表不存在'));
      }
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
        .maybeSingle();

      if (scaleError) throw scaleError;
      if (!scale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
   * Get questions for a scale (auto-detects legacy or item bank mode)
   */
  getQuestions: async (id: string): Promise<APIResponse<{ questions: Question[]; total: number }>> => {
    try {
      // First, try legacy questions table
      const { data: legacyQuestions, error: legacyError } = await supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .eq('scale_id', id)
        .order('order_num');

      if (legacyError) throw legacyError;

      // If legacy questions exist, return them
      if (legacyQuestions && legacyQuestions.length > 0) {
        return formatResponse({
          questions: legacyQuestions as Question[],
          total: legacyQuestions.length,
        }, null);
      }

      // If no legacy questions, try item bank mode
      // First check if there are scale_items for this scale
      const { data: scaleItems, error: scaleItemsError } = await supabase
        .from('scale_items')
        .select('*')
        .eq('scale_id', id)
        .order('order_num');

      if (scaleItemsError) {
        // scale_items table might not exist, fall back to empty
        console.warn('scale_items query failed:', scaleItemsError);
        return formatResponse({
          questions: [],
          total: 0,
        }, null);
      }

      if (!scaleItems || scaleItems.length === 0) {
        // No questions in either mode
        return formatResponse({
          questions: [],
          total: 0,
        }, null);
      }

      // Get item IDs from scale_items
      const itemIds = scaleItems.map(si => si.item_id);

      // Fetch items from item_bank
      const { data: items, error: itemsError } = await supabase
        .from('item_bank')
        .select('*')
        .in('id', itemIds);

      if (itemsError) {
        console.warn('item_bank query failed:', itemsError);
        return formatResponse({
          questions: [],
          total: 0,
        }, null);
      }

      // Create a map for quick lookup
      const itemsMap = new Map((items || []).map(item => [item.id, item]));

      // Transform scale_items + item_bank to Question format
      const questions: Question[] = scaleItems
        .map(si => {
          const item = itemsMap.get(si.item_id);
          if (!item) return null;

          return {
            id: si.item_id, // Use item_id as question id for answer tracking
            scale_id: id,
            content: item.content,
            dimension: si.custom_dimension || item.domain,
            options: item.options || [],
            order_num: si.order_num,
            reverse_scored: item.reverse_scored || false,
            weight: si.custom_weight || item.default_weight || 1,
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null) as Question[];

      return formatResponse({
        questions,
        total: questions.length,
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
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existingScale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existingScale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
   * Falls back to showing all active scales if publications table has issues
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

      // Try to get student's profile for organization info
      // If profile fetch fails, we'll still show all published scales
      let profile: { college_id?: string; major_id?: string; class_id?: string } | null = null;
      try {
        profile = await getUserProfile(user.id);
      } catch (profileError) {
        console.warn('Profile fetch failed, will show all published scales:', profileError);
      }

      let visibleScaleIds: string[] = [];

      try {
        // Try to get active publications using select=* to avoid column name issues
        const { data: publications, error: pubError } = await supabase
          .from('scale_publications')
          .select('*')
          .eq('is_active', true);

        if (pubError) throw pubError;

        // Filter publications based on student's organization
        // Use dynamic column names to handle different database schemas
        visibleScaleIds = (publications || [])
          .filter(pub => {
            const visType = pub.visibility_type;
            if (visType === 'all') return true;
            // If no profile, only show 'all' visibility publications
            if (!profile) return false;
            if (visType === 'college') {
              const targetCollegeId = pub.target_college_id || pub.college_id;
              return targetCollegeId === profile.college_id;
            }
            if (visType === 'major') {
              const targetMajorId = pub.target_major_id || pub.major_id;
              return targetMajorId === profile.major_id;
            }
            if (visType === 'class') {
              const targetClassId = pub.target_class_id || pub.class_id;
              return targetClassId === profile.class_id;
            }
            return false;
          })
          .map(pub => pub.scale_id);
      } catch (pubError) {
        // If publications table query fails, fall back to showing all active scales
        console.warn('Publications query failed, showing all active scales:', pubError);
        visibleScaleIds = []; // Empty means show all
      }

      // Build scales query
      let query = supabase
        .from('scales')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Only filter by scale IDs if we have valid publications
      if (visibleScaleIds.length > 0) {
        query = query.in('id', visibleScaleIds);
      }
      // If visibleScaleIds is empty (no publications or error), show all active scales

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
        .maybeSingle();

      if (scaleError) throw scaleError;
      if (!scale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
        .maybeSingle();

      if (scaleError) throw scaleError;
      if (!scale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
        .maybeSingle();

      if (questionError) throw questionError;
      if (!question) {
        return formatResponse(null, new Error('题目不存在'));
      }

      // Verify ownership
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', question.scale_id)
        .maybeSingle();

      if (scaleError) throw scaleError;
      if (!scale) {
        return formatResponse(null, new Error('量表不存在'));
      }

      const profile = await getUserProfile(user.id);
      if (scale.created_by !== user.id && profile.role !== 'admin') {
        return formatResponse(null, new Error('无权限修改此题目'));
      }

      const { data: updated, error } = await supabase
        .from('questions')
        .update(data)
        .eq('id', questionId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        return formatResponse(null, new Error('更新失败'));
      }
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
        .maybeSingle();

      if (questionError) throw questionError;
      if (!question) {
        return formatResponse(null, new Error('题目不存在'));
      }

      // Verify ownership
      const { data: scale, error: scaleError } = await supabase
        .from('scales')
        .select('created_by')
        .eq('id', question.scale_id)
        .maybeSingle();

      if (scaleError) throw scaleError;
      if (!scale) {
        return formatResponse(null, new Error('量表不存在'));
      }

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
