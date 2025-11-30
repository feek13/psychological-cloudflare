/**
 * Scoring Worker Types
 */

export interface Question {
  id: string;
  content: string;
  order_num?: number;
  reverse_scored?: boolean;
  weight?: number;
  dimension?: string;
  domain?: string;
  subdomain?: string;
  options?: Option[];
}

export interface Option {
  value: number;
  label: string;
}

export interface ScaleConfig {
  method?: 'sum' | 'average' | 'weighted';
  max_score?: number;
  min_score?: number;
}

export interface InterpretationLevel {
  level: 'normal' | 'mild' | 'moderate' | 'severe';
  range_min: number;
  range_max: number;
  description: string;
  suggestions: string[];
}

export interface InterpretationConfig {
  levels: InterpretationLevel[];
}

export interface DimensionConfig {
  name: string;
  description?: string;
  questions: number[];
}

export interface FactorScore {
  name: string;
  name_en: string;
  description: string;
  total_score: number;
  mean_score: number;
  question_count: number;
  norm_mean: number;
  above_norm: boolean;
}

export interface DimensionScore {
  total: number;
  mean: number;
  question_count: number;
  description?: string;
}

export interface SeverityInfo {
  level: string;
  description: string;
  suggestions: string[];
}

export interface NormComparison {
  national_norm_mean: number;
  national_norm_sd: number;
  above_norm: boolean;
  z_score: number;
}

export interface SCL90Result {
  total_score: number;
  mean_score: number;
  total_mean: number;
  question_count: number;
  positive_item_count: number;
  positive_symptom_mean: number;
  factor_scores: Record<string, FactorScore>;
  dimension_scores: Record<string, number>;
  severity: string;
  severity_info: SeverityInfo;
  norm_comparison: NormComparison;
  recommendations: string[];
}

export interface GenericScoreResult {
  total_score: number;
  final_score: number;
  mean_score: number;
  average_score: number;
  total_mean: number;
  question_count: number;
  severity?: string;
  severity_info?: SeverityInfo;
  dimension_scores: Record<string, DimensionScore>;
  scoring_method: string;
  used_weights: boolean;
  used_reverse_scoring: boolean;
}

export interface ScoringRequest {
  scale_code: string;
  answers: Record<string, number>;
  scale_config?: ScaleConfig;
  questions?: Record<string, Question>;
  interpretation_config?: InterpretationConfig;
  dimension_config?: DimensionConfig[];
}

export interface ScoringResponse {
  success: boolean;
  data?: SCL90Result | GenericScoreResult;
  error?: string;
}
