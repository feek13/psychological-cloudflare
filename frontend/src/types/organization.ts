/**
 * Organization-related TypeScript types
 * 组织架构相关类型定义
 */

export interface College {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  majors?: Major[];
}

export interface Major {
  id: string;
  code: string;
  name: string;
  college_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
  college?: College;
  classes?: Class[];
}

export interface Class {
  id: string;
  code?: string;
  name?: string;
  class_name?: string;
  class_number?: number;
  major_id: string;
  enrollment_year: number;
  description?: string;
  created_at: string;
  updated_at: string;
  major?: Major;
}

export interface OrganizationTree {
  colleges: College[];
}

export interface StudentIdPreview {
  student_id: string;
  next_number: number;
  format_description: string;
  breakdown?: {
    年份: string;
    学院代码: string;
    专业代码: string;
    班级号: string;
    序号: string;
    完整学号: string;
  };
}

export interface TeacherPermission {
  id: string;
  teacher_id: string;
  permission_type: 'class' | 'major' | 'college' | 'school';
  permission_level?: 'class' | 'major' | 'college' | 'school'; // Alias for database field
  target_id?: string | null;
  college_id?: string | null;
  major_id?: string | null;
  class_id?: string | null;
  academic_year: string;
  created_at: string;
  created_by?: string | null;
  // Enriched organization info
  class_info?: Class;
  major_info?: Major;
  college_info?: College;
  college_name?: string;
  major_name?: string;
  class_name?: string;
}

export interface TeacherPermissionCreate {
  teacher_id: string;
  permission_type: 'class' | 'major' | 'college' | 'school';
  target_id?: string | null;
  academic_year?: string;
}

export interface TeacherPermissionAssign {
  permissions: TeacherPermissionCreate[];
}
