/**
 * Publication-related TypeScript types
 * 发布相关的 TypeScript 类型定义
 */

import type { Scale } from './scale';
import type { GradeLabel } from './teachers';

// Updated visibility types to match organization-based system
// Includes legacy 'grades' and 'classes' for backward compatibility
export type VisibilityType = 'all' | 'college' | 'major' | 'class' | 'grades' | 'classes';

export interface PublicationCreate {
  scale_id: string;
  visibility_type?: VisibilityType;
  target_college_id?: string | null;
  target_major_id?: string | null;
  target_class_id?: string | null;
  target_grades?: GradeLabel[] | null;
  target_classes?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface PublicationUpdate {
  visibility_type?: VisibilityType;
  target_college_id?: string | null;
  target_major_id?: string | null;
  target_class_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
}

export interface Publication {
  id: string;
  scale_id: string;
  published_by: string;
  visibility_type: VisibilityType;
  // Organization-based targeting
  target_college_id?: string | null;
  target_major_id?: string | null;
  target_class_id?: string | null;
  // Legacy grade-based targeting (kept for compatibility)
  target_grades?: GradeLabel[] | null;
  target_classes?: string[] | null;
  created_at: string;
  start_time?: string | null;
  end_time?: string | null;
  is_active: boolean;
}

export interface PublicationListItem extends Publication {
  scale_name: string;
  scale_code: string;
  // Enriched organization names
  target_college_name?: string;
  target_major_name?: string;
  target_class_name?: string;
  // Statistics
  target_student_count: number;
  total_assessments?: number;
  completed_count: number;
  in_progress_count: number;
  completion_rate: number;
}

export interface PublicationStatistics {
  target_student_count: number;
  completed_count: number;
  in_progress_count: number;
  completion_rate: number;
}

export interface PublicationDetail extends Publication {
  scale?: Scale;
  // Enriched organization names
  target_college_name?: string;
  target_major_name?: string;
  target_class_name?: string;
  // Flat statistics (not nested)
  target_student_count: number;
  completed_count: number;
  in_progress_count: number;
  completion_rate: number;
}

export interface PublicationFilters {
  is_active?: boolean;
  scale_id?: string;
  skip?: number;
  limit?: number;
}
