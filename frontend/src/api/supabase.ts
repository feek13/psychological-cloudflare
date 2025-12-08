import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://148.135.56.115:8000';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const apiProxyUrl = import.meta.env.VITE_API_PROXY_WORKER_URL || '';

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY is not set');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Create admin Supabase client that uses API proxy with service role key
 * This client bypasses RLS and should only be used for admin/teacher queries
 * The API proxy verifies the user has admin/teacher role before allowing access
 */
export const createAdminClient = (): SupabaseClient | null => {
  if (!apiProxyUrl) {
    console.warn('VITE_API_PROXY_WORKER_URL is not set, admin queries will use regular client');
    return null;
  }

  // Use API proxy with /admin prefix for admin queries
  const adminUrl = `${apiProxyUrl}/admin`;

  return createClient(adminUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        // The token will be added by the supabase client from the session
      },
    },
  });
};

// Lazy-initialized admin client
let _adminClient: SupabaseClient | null = null;

/**
 * Get admin Supabase client with current user's token
 * Returns null if API proxy is not configured
 */
export const getAdminClient = async (): Promise<SupabaseClient | null> => {
  if (!apiProxyUrl) {
    return null;
  }

  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return null;
  }

  // Create admin client with the user's token
  const adminUrl = `${apiProxyUrl}/admin`;

  return createClient(adminUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    },
  });
};

// 获取当前用户的 JWT token
export const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// 获取当前用户（确保会话就绪）
export const getCurrentUser = async () => {
  // 首先获取 session（从本地存储加载）
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // 没有会话，返回 null
    return null;
  }

  // 会话存在，验证用户（使用已存在的会话）
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 获取当前用户（带重试机制）
export const getCurrentUserWithRetry = async (maxRetries = 3, delayMs = 500) => {
  for (let i = 0; i < maxRetries; i++) {
    const user = await getCurrentUser();
    if (user) return user;

    // 等待一段时间后重试
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return null;
};

// 获取用户 profile
export const getUserProfile = async (userId?: string) => {
  // If no userId provided, get current user's profile
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export default supabase;
