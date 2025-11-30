// Note: Use APIResponse from '@/types' or '@/types/auth' directly
// Removed circular re-export

export interface QuestionOption {
  value: number;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  scale_id: string;
  content: string;
  description?: string;
  dimension?: string;
  options: QuestionOption[];
  order_num: number;
  reverse_scored: boolean;
  weight: number;
}

export interface Scale {
  id: string;
  code: string;
  name: string;
  category: 'mental_health' | 'personality' | 'emotion';
  version: string;
  description?: string;
  instructions?: string;
  total_questions: number;
  estimated_duration?: number;
  is_active: boolean;
  is_public: boolean;
  scoring_config?: any;
  interpretation_config?: any;
  dimension_config?: any[];
  created_at: string;
  updated_at: string;
}

export interface ScaleWithQuestions extends Scale {
  questions: Question[];
}

// Create question input
export interface QuestionCreate {
  content: string;
  dimension?: string;
  options: QuestionOption[];
  order_num: number;
  reverse_scored?: boolean;
  weight?: number;
}

// Create scale input
export interface ScaleCreate {
  code: string;
  name: string;
  category: 'mental_health' | 'personality' | 'emotion';
  version: string;
  description?: string;
  total_questions: number;
  estimated_duration?: number;
  is_active?: boolean;
  is_public?: boolean;
  scoring_config?: any;
  interpretation_config?: any;
  dimension_config?: any[];
  questions?: QuestionCreate[];
}

// Update scale input (all fields optional)
export interface ScaleUpdate {
  code?: string;
  name?: string;
  category?: 'mental_health' | 'personality' | 'emotion';
  version?: string;
  description?: string;
  total_questions?: number;
  estimated_duration?: number;
  scoring_config?: any;
  interpretation_config?: any;
  dimension_config?: any[];
  is_active?: boolean;
  is_public?: boolean;
}

// Scale statistics
export interface ScaleStatistics {
  scale_id: string;
  scale_name: string;
  scale_code: string;
  total_assessments: number;
  completed_assessments: number;
  in_progress_assessments: number;
  completion_rate: number;
  avg_score: number | null;
  min_score: number | null;
  max_score: number | null;
  avg_completion_time: number | null;
}
