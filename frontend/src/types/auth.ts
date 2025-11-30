export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string | null;
  role: 'student' | 'teacher' | 'counselor' | 'admin';
  created_at: string;
  updated_at?: string;
  grade?: string;
  class_name?: string;
  student_id?: string | null;
  // Organization fields
  college_id?: string | null;
  major_id?: string | null;
  class_id?: string | null;
  enrollment_year?: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  full_name?: string;
  role: 'student' | 'teacher' | 'counselor' | 'admin';
  grade?: string;
  class_name?: string;
  student_id?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UpdateProfileRequest {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code?: number;
}
