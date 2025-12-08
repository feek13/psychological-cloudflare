/**
 * Shared API utilities
 * 共享的 API 工具函数
 */

import type { APIResponse } from '@/types';

/**
 * Format API response with error handling
 * 格式化 API 响应（带错误处理）
 *
 * Use this when you want to return errors in the response object
 * instead of throwing them
 */
export function formatResponse<T>(
  data: T | null,
  error: Error | null,
  message?: string
): APIResponse<T> {
  if (error) {
    return {
      success: false,
      message: error.message,
      data: undefined as unknown as T,
    };
  }
  return {
    success: true,
    message: message || 'Success',
    data: data as T,
  };
}

/**
 * Format successful response
 * 格式化成功响应
 *
 * Use this when errors are thrown (try/catch pattern)
 * instead of returned in the response
 */
export function formatSuccess<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
  };
}
