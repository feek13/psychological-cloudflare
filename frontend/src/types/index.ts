/**
 * Centralized export for all TypeScript types
 * 所有 TypeScript 类型的统一导出
 */

export * from './auth';
export * from './scale';
export * from './assessment';
export * from './teachers';
export * from './publications';
export * from './students';
export * from './item-bank';
export * from './organization';

// Common API response type
export interface APIResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string;
  message?: string;
}

// Common pagination types
export interface PaginatedRequest {
  skip?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}
