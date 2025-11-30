/**
 * Assessments API - Supabase Direct Access
 * Uses Supabase for database operations and Cloudflare Workers for scoring/AI
 */

import supabase, { getCurrentUser } from './supabase';
import type { Assessment, ScoreStatistics } from '@/types/assessment';
import type { APIResponse } from '@/types';

// Worker URLs (will be configured via environment variables after deployment)
const SCORING_WORKER_URL = import.meta.env.VITE_SCORING_WORKER_URL || '';
const AI_REPORT_WORKER_URL = import.meta.env.VITE_AI_REPORT_WORKER_URL || '';

// Types for worker responses
interface ScoringResponse {
  success: boolean;
  scores?: {
    total_score: number;
    total_mean: number;
    factor_scores?: Record<string, {
      name: string;
      mean_score: number;
      above_norm?: boolean;
    }>;
    severity?: string;
    severity_info?: {
      level: string;
      description: string;
      suggestions: string[];
    };
  };
  error?: string;
}

interface AIReportResponse {
  success: boolean;
  report?: string;
  model_used?: string;
  error?: string;
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

// Call Scoring Worker
async function callScoringWorker(
  scaleCode: string,
  answers: Record<string, number>,
  questions: Array<{
    id: string;
    content: string;
    reverse_scored?: boolean;
    weight?: number;
    dimension?: string;
  }>
): Promise<ScoringResponse> {
  if (!SCORING_WORKER_URL) {
    console.warn('Scoring Worker URL not configured, using fallback scoring');
    return calculateFallbackScores(answers, questions);
  }

  try {
    const response = await fetch(`${SCORING_WORKER_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale_code: scaleCode,
        answers,
        questions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Scoring worker error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Scoring worker call failed:', error);
    return calculateFallbackScores(answers, questions);
  }
}

// Fallback scoring when worker is unavailable
function calculateFallbackScores(
  answers: Record<string, number>,
  questions: Array<{
    id: string;
    reverse_scored?: boolean;
    weight?: number;
  }>
): ScoringResponse {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  let totalScore = 0;
  let totalWeight = 0;
  let maxPossible = 0;

  for (const [questionId, answerValue] of Object.entries(answers)) {
    const question = questionMap.get(questionId);
    const weight = question?.weight || 1;
    let adjustedScore = answerValue;

    // Handle reverse scoring
    if (question?.reverse_scored) {
      adjustedScore = 5 - answerValue + 1; // Assuming 1-5 scale
    }

    totalScore += adjustedScore * weight;
    totalWeight += weight;
    maxPossible += 5 * weight;
  }

  const questionCount = Object.keys(answers).length;
  const totalMean = questionCount > 0 ? totalScore / questionCount : 0;

  // Determine severity based on mean score
  let severity = 'normal';
  if (totalMean >= 4) severity = 'severe';
  else if (totalMean >= 3) severity = 'moderate';
  else if (totalMean >= 2) severity = 'mild';

  return {
    success: true,
    scores: {
      total_score: totalScore,
      total_mean: parseFloat(totalMean.toFixed(2)),
      severity,
      severity_info: {
        level: severity,
        description: getSeverityDescription(severity),
        suggestions: getSeveritySuggestions(severity),
      },
    },
  };
}

function getSeverityDescription(severity: string): string {
  const descriptions: Record<string, string> = {
    normal: '您的心理健康状况良好，请继续保持积极的生活态度。',
    mild: '您可能存在一些轻度心理困扰，建议关注自我调节，保持规律作息。',
    moderate: '您可能存在中度心理困扰，建议寻求学校心理咨询中心的专业帮助。',
    severe: '您可能存在较严重的心理困扰，强烈建议尽快寻求专业心理健康服务。',
  };
  return descriptions[severity] || descriptions.normal;
}

function getSeveritySuggestions(severity: string): string[] {
  const suggestions: Record<string, string[]> = {
    normal: ['继续保持良好的生活习惯', '定期进行心理健康自测'],
    mild: ['保持规律的作息时间', '适当进行体育锻炼', '与朋友家人多交流'],
    moderate: ['建议预约学校心理咨询服务', '学习一些放松技巧', '保持社交活动'],
    severe: ['尽快寻求专业心理健康服务', '告知信任的家人或朋友', '避免独处'],
  };
  return suggestions[severity] || suggestions.normal;
}

// Call AI Report Worker
async function callAIReportWorker(
  scaleName: string,
  scores: ScoringResponse['scores'],
  questionsWithAnswers: Array<{ content: string; answer: number; dimension?: string }>
): Promise<AIReportResponse> {
  if (!AI_REPORT_WORKER_URL) {
    console.warn('AI Report Worker URL not configured, using fallback report');
    return generateFallbackReport(scaleName, scores);
  }

  try {
    const response = await fetch(`${AI_REPORT_WORKER_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale_name: scaleName,
        scores,
        questions_with_answers: questionsWithAnswers,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Report worker error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Report worker call failed:', error);
    return generateFallbackReport(scaleName, scores);
  }
}

// Fallback report when AI worker is unavailable
function generateFallbackReport(
  scaleName: string,
  scores?: ScoringResponse['scores']
): AIReportResponse {
  const severity = scores?.severity || 'normal';
  const totalScore = scores?.total_score ?? 'N/A';
  const totalMean = scores?.total_mean ?? 0;

  let report = `## ${scaleName} 测评分析\n\n`;
  report += `**总分**: ${totalScore} | **均分**: ${totalMean.toFixed(2)}\n\n`;
  report += `### 总体评估\n${getSeverityDescription(severity)}\n\n`;

  if (scores?.factor_scores) {
    report += '### 各维度情况\n';
    for (const [, data] of Object.entries(scores.factor_scores)) {
      if (data.above_norm) {
        report += `- **${data.name}**: 偏高，需要关注\n`;
      }
    }
  }

  report += '\n### 建议\n';
  const suggestions = getSeveritySuggestions(severity);
  suggestions.forEach((s, i) => {
    report += `${i + 1}. ${s}\n`;
  });

  report += '\n*注：AI 分析服务暂时不可用，以上为基础评估结果。*';

  return {
    success: true,
    report,
    model_used: 'fallback',
  };
}

export const assessmentsAPI = {
  /**
   * Create a new assessment
   */
  create: async (scaleId: string): Promise<APIResponse<Assessment>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Check for existing active assessment
      const { data: existing } = await supabase
        .from('assessments')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('scale_id', scaleId)
        .in('status', ['in_progress', 'completed'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'completed') {
          return formatResponse(null, new Error('您已完成此量表的测评'));
        }
        // Return existing in-progress assessment
        const { data: assessment, error } = await supabase
          .from('assessments')
          .select('*, scales(id, code, name, category)')
          .eq('id', existing.id)
          .single();

        if (error) throw error;
        return formatResponse(assessment as Assessment, null, '继续进行中的测评');
      }

      // Create new assessment
      const { data: newAssessment, error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          scale_id: scaleId,
          status: 'in_progress',
          progress: 0,
          answers: {},
          started_at: new Date().toISOString(),
        })
        .select('*, scales(id, code, name, category)')
        .single();

      if (error) throw error;
      return formatResponse(newAssessment as Assessment, null, '测评已创建');
    } catch (error) {
      console.error('Create assessment error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * List user's assessments
   */
  list: async (params?: {
    scale_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<APIResponse<{ items: Assessment[]; total: number }>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      let query = supabase
        .from('assessments')
        .select('*, scales(id, code, name, category)', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (params?.scale_id) {
        query = query.eq('scale_id', params.scale_id);
      }
      if (params?.status) {
        query = query.eq('status', params.status);
      }
      if (params?.skip) {
        query = query.range(params.skip, params.skip + (params.limit || 20) - 1);
      } else if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return formatResponse({
        items: (data || []) as Assessment[],
        total: count || 0,
      }, null);
    } catch (error) {
      console.error('List assessments error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get single assessment by ID
   */
  get: async (id: string): Promise<APIResponse<Assessment>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('*, scales(id, code, name, category)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return formatResponse(data as Assessment, null);
    } catch (error) {
      console.error('Get assessment error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Submit a single answer (auto-save)
   */
  submitAnswer: async (
    id: string,
    questionId: string,
    answerValue: number
  ): Promise<APIResponse<void>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get current assessment
      const { data: assessment, error: fetchError } = await supabase
        .from('assessments')
        .select('answers, scales(id, code, name)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update answers
      const currentAnswers = (assessment.answers as Record<string, number>) || {};
      const updatedAnswers = {
        ...currentAnswers,
        [questionId]: answerValue,
      };

      // Calculate progress (need to get total questions count)
      // For now, just update the answers
      const { error: updateError } = await supabase
        .from('assessments')
        .update({
          answers: updatedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      return formatResponse(undefined, null, '答案已保存');
    } catch (error) {
      console.error('Submit answer error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Submit complete assessment for scoring
   */
  submit: async (
    id: string,
    answers: Record<string, number>
  ): Promise<APIResponse<Assessment>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get assessment with scale info
      const { data: assessment, error: fetchError } = await supabase
        .from('assessments')
        .select('*, scales(id, code, name, category, scoring_config)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!assessment) {
        return formatResponse(null, new Error('测评不存在'));
      }

      const scale = assessment.scales as { id: string; code: string; name: string; scoring_config?: unknown };

      // Get questions for this scale
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, content, order_num, reverse_scored, weight, dimension')
        .eq('scale_id', scale.id)
        .order('order_num');

      if (questionsError) throw questionsError;

      // Call scoring worker
      const scoringResult = await callScoringWorker(
        scale.code,
        answers,
        (questions || []).map(q => ({
          id: q.id,
          content: q.content,
          reverse_scored: q.reverse_scored,
          weight: q.weight,
          dimension: q.dimension,
        }))
      );

      if (!scoringResult.success) {
        return formatResponse(null, new Error(scoringResult.error || '评分失败'));
      }

      // Prepare questions with answers for AI report
      const questionsWithAnswers = (questions || []).map(q => ({
        content: q.content,
        answer: answers[q.id] || 0,
        dimension: q.dimension,
      }));

      // Call AI report worker
      const aiResult = await callAIReportWorker(
        scale.name,
        scoringResult.scores,
        questionsWithAnswers
      );

      // Update assessment with results
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('assessments')
        .update({
          status: 'completed',
          progress: 100,
          answers,
          raw_scores: scoringResult.scores,
          completed_at: new Date().toISOString(),
          metadata: {
            ai_report: aiResult.report || null,
            ai_model: aiResult.model_used || null,
          },
        })
        .eq('id', id)
        .select('*, scales(id, code, name, category)')
        .single();

      if (updateError) throw updateError;
      return formatResponse(updatedAssessment as Assessment, null, '测评已完成');
    } catch (error) {
      console.error('Submit assessment error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Delete an assessment
   */
  delete: async (id: string): Promise<APIResponse<void>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return formatResponse(undefined, null, '测评已删除');
    } catch (error) {
      console.error('Delete assessment error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get assessment statistics summary
   */
  getStats: async (): Promise<APIResponse<{
    total: number;
    completed: number;
    in_progress: number;
  }>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        completed: data?.filter(a => a.status === 'completed').length || 0,
        in_progress: data?.filter(a => a.status === 'in_progress').length || 0,
      };

      return formatResponse(stats, null);
    } catch (error) {
      console.error('Get stats error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Get score statistics for completed assessments
   */
  getScoreStats: async (): Promise<APIResponse<ScoreStatistics>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('raw_scores, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return formatResponse({
          avg_score: null,
          min_score: null,
          max_score: null,
          completed_count: 0,
          recent_trend: null,
        }, null);
      }

      const scores = data
        .map(a => (a.raw_scores as { total_mean?: number })?.total_mean)
        .filter((s): s is number => s !== undefined && s !== null);

      const stats: ScoreStatistics = {
        avg_score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
        min_score: scores.length > 0 ? Math.min(...scores) : null,
        max_score: scores.length > 0 ? Math.max(...scores) : null,
        completed_count: data.length,
        recent_trend: calculateTrend(scores),
      };

      return formatResponse(stats, null);
    } catch (error) {
      console.error('Get score stats error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Batch get assessment status for multiple scales
   */
  getStatusBatch: async (
    scaleIds: string[]
  ): Promise<APIResponse<Record<string, {
    assessment_id: string;
    status: string;
    progress: number;
    completed_at: string | null;
  }>>> => {
    try {
      if (scaleIds.length === 0) {
        return formatResponse({}, null, '没有提供量表ID');
      }

      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      const { data, error } = await supabase
        .from('assessments')
        .select('id, scale_id, status, progress, completed_at')
        .eq('user_id', user.id)
        .in('scale_id', scaleIds)
        .in('status', ['in_progress', 'completed']);

      if (error) throw error;

      const result: Record<string, {
        assessment_id: string;
        status: string;
        progress: number;
        completed_at: string | null;
      }> = {};

      for (const assessment of data || []) {
        result[assessment.scale_id] = {
          assessment_id: assessment.id,
          status: assessment.status,
          progress: assessment.progress,
          completed_at: assessment.completed_at,
        };
      }

      return formatResponse(result, null);
    } catch (error) {
      console.error('Get status batch error:', error);
      return formatResponse(null, error as Error);
    }
  },

  /**
   * Regenerate AI report for a completed assessment
   */
  regenerateReport: async (id: string): Promise<APIResponse<Assessment>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return formatResponse(null, new Error('未登录'));
      }

      // Get assessment
      const { data: assessment, error: fetchError } = await supabase
        .from('assessments')
        .select('*, scales(id, code, name, category)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!assessment) {
        return formatResponse(null, new Error('测评不存在'));
      }

      if (assessment.status !== 'completed') {
        return formatResponse(null, new Error('只能为已完成的测评重新生成报告'));
      }

      const scale = assessment.scales as { id: string; code: string; name: string };
      const answers = assessment.answers as Record<string, number>;
      const rawScores = assessment.raw_scores as ScoringResponse['scores'];

      // Get questions
      const { data: questions } = await supabase
        .from('questions')
        .select('id, content, dimension')
        .eq('scale_id', scale.id);

      // Prepare questions with answers
      const questionsWithAnswers = (questions || []).map(q => ({
        content: q.content,
        answer: answers[q.id] || 0,
        dimension: q.dimension,
      }));

      // Call AI report worker
      const aiResult = await callAIReportWorker(
        scale.name,
        rawScores,
        questionsWithAnswers
      );

      // Update metadata with new report
      const currentMetadata = (assessment.metadata as Record<string, unknown>) || {};
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('assessments')
        .update({
          metadata: {
            ...currentMetadata,
            ai_report: aiResult.report || null,
            ai_model: aiResult.model_used || null,
            report_regenerated_at: new Date().toISOString(),
          },
        })
        .eq('id', id)
        .select('*, scales(id, code, name, category)')
        .single();

      if (updateError) throw updateError;
      return formatResponse(updatedAssessment as Assessment, null, 'AI报告已重新生成');
    } catch (error) {
      console.error('Regenerate report error:', error);
      return formatResponse(null, error as Error);
    }
  },
};

// Helper function to calculate score trend
function calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' | null {
  if (scores.length < 2) return null;

  // Compare recent scores (lower is better for most psychological scales)
  const recent = scores.slice(0, Math.min(3, scores.length));
  const older = scores.slice(Math.min(3, scores.length), Math.min(6, scores.length));

  if (older.length === 0) return null;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;

  if (Math.abs(diff) < 0.3) return 'stable';
  return diff < 0 ? 'improving' : 'declining';
}

export default assessmentsAPI;
