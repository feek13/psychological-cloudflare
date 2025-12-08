/**
 * Student-related TypeScript types
 * 学生相关的 TypeScript 类型定义
 */

export interface StudentListItem {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  student_id?: string;
  role: 'student';
  // Organization IDs
  college_id?: string | null;
  major_id?: string | null;
  class_id?: string | null;
  enrollment_year?: number | null;
  // Enriched organization names
  college_name?: string;
  major_name?: string;
  class_name?: string;
  // Legacy support
  grade?: number;
  // Statistics
  avg_score?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface StudentDetail extends StudentListItem {
  avatar_url?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  medical_history?: any[];
  emergency_contact?: any;
  is_active?: boolean;
  last_login_at?: string;
  // Assessment history
  assessments?: any[];
}

export interface StudentReportItem {
  id: string;
  assessment_id?: string;
  scale_id: string;
  scale_name: string;
  scale_code: string;
  status?: string;
  completed_at?: string;
  raw_scores?: any;
  metadata?: any;
  has_report?: boolean;
}

export interface StudentStatistics {
  total_students: number;
  total_assessments: number;
  completed_assessments: number;
  in_progress_assessments: number;
  completion_rate: number;
  class_count?: number;           // 班级数量
  by_grade?: Record<string | number, GradeStatistics>;
  by_class?: Record<string, GradeStatistics>;
}

export interface GradeStatistics {
  grade: string;                    // 组织名称 (学院/专业/班级)
  level?: 'college' | 'major' | 'class';  // 组织级别
  total_students: number;           // 学生总数
  total_assessments: number;        // 测评总数
  completed_assessments: number;    // 已完成测评数
  completion_rate: number;          // 完成率 (0-100)
  avg_score: number | null;         // 平均分
  min_score: number | null;         // 最低分
  max_score: number | null;         // 最高分
}

export interface StudentFilters {
  skip?: number;
  limit?: number;
  // Organization-based filters
  college_id?: string;
  major_id?: string;
  class_id?: string;
  search?: string;
}
