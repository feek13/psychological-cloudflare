// Note: Use APIResponse from '@/types' or '@/types/auth' directly
// Removed circular re-export

export interface Assessment {
  id: string;
  user_id: string;
  scale_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  started_at: string;
  completed_at?: string;
  answers: Record<string, number>;
  raw_scores?: {
    total_score?: number;
    total_mean?: number;
    factor_scores?: Record<string, any>;
    dimension_scores?: Record<string, number>;
    severity?: 'normal' | 'mild' | 'moderate' | 'severe';
    severity_info?: {
      level: string;
      description: string;
      suggestions: string[];
    };
  };
  normalized_scores?: any;
  dimension_scores?: Record<string, number>;
  metadata?: {
    ai_report?: string;
  };
  scales?: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
}

export interface AssessmentWithScale extends Assessment {
  scale: any;
}

export interface ScoreStatistics {
  avg_score: number | null;
  min_score: number | null;
  max_score: number | null;
  completed_count: number;
  recent_trend: 'improving' | 'declining' | 'stable' | null;
}
