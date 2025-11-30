/**
 * Centralized export for all API clients
 * 所有 API 客户端的统一导出
 *
 * Note: This project uses Supabase directly instead of REST API
 */

// Supabase client
export { default as supabase, getCurrentUser, getAccessToken, getUserProfile } from './supabase';

// API modules
export { authAPI } from './auth';
export * from './scales';
export * from './assessments';
export { teachersAPI } from './teachers';
export { publicationsAPI } from './publications';
export { studentsAPI } from './students';
export { organizationAPI } from './organization';
export { itemBankAPI } from './item-bank';
