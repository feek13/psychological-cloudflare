/**
 * Teacher-related TypeScript types
 * 教师相关的 TypeScript 类型定义
 */

import type { TeacherPermission } from './organization';

// Grade type can be number (enrollment year) or string (label)
export type Grade = number | string;

// Grade labels for UI display
export type GradeLabel = 'freshman' | 'sophomore' | 'junior' | 'senior';

// Grade labels mapping
export const GRADE_LABELS: Record<GradeLabel, string> = {
  freshman: '大一',
  sophomore: '大二',
  junior: '大三',
  senior: '大四',
};

export interface TeacherGrade {
  id: string;
  teacher_id: string;
  grade: Grade;
  academic_year: string;
  created_at: string;
  created_by?: string;
}

// Updated to work with permission-based system
export interface TeacherGradeAssign {
  permission_level?: 'school' | 'college' | 'major' | 'class';
  college_id?: string | null;
  major_id?: string | null;
  class_id?: string | null;
  academic_year?: string;
}

export interface TeacherInfo {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'teacher';
  created_at: string;
  updated_at?: string;
  // Permission-based system
  permissions?: TeacherPermission[];
}

export interface TeacherListItem {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'teacher';
  created_at: string;
  updated_at?: string;
  // Permission-based system
  permissions?: TeacherPermission[];
}

export interface TeacherStatistics {
  total_teachers: number;
  active_teachers: number;
}
