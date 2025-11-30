/**
 * AI Report Worker Types
 */

export interface FactorScore {
  name: string;
  name_en?: string;
  mean_score?: number;
  mean?: number;
  above_norm?: boolean;
  description?: string;
}

export interface Scores {
  total_score: number;
  total_mean?: number;
  mean_score?: number;
  severity?: 'normal' | 'mild' | 'moderate' | 'severe';
  factor_scores?: Record<string, FactorScore>;
  dimension_scores?: Record<string, number>;
}

export interface QuestionWithAnswer {
  content: string;
  answer: number;
  dimension?: string;
}

export interface UserProfile {
  id?: string;
  full_name?: string;
  student_id?: string;
}

export interface ReportRequest {
  scale_name: string;
  scale_code?: string;
  scores: Scores;
  questions_with_answers?: QuestionWithAnswer[];
  user_profile?: UserProfile;
}

export interface ReportResponse {
  success: boolean;
  report?: string;
  model_used?: string;
  error?: string;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterChoice {
  message: {
    content: string;
  };
}

export interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message: string;
  };
}

export interface Env {
  OPENROUTER_API_KEY: string;
}
