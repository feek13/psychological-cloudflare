import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, getUserProfile } from '@/api/supabase';
import type { User } from '@/types/auth';
import toast from 'react-hot-toast';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    full_name?: string;
    role?: string;
    college_id?: string;
    major_id?: string;
    class_id?: string;
    enrollment_year?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  initialize: () => Promise<void>;
}

export const authStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: false,

      initialize: async () => {
        if (get().initialized) return;

        try {
          // Check for existing session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Fetch user profile from profiles table
            const profile = await getUserProfile(session.user.id);
            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                username: profile?.username || '',
                full_name: profile?.full_name || '',
                role: profile?.role || 'student',
                student_id: profile?.student_id || null,
                college_id: profile?.college_id || null,
                major_id: profile?.major_id || null,
                class_id: profile?.class_id || null,
                enrollment_year: profile?.enrollment_year || null,
                avatar_url: profile?.avatar_url || null,
                created_at: profile?.created_at || '',
                updated_at: profile?.updated_at || '',
              },
              isAuthenticated: true,
              initialized: true,
            });
          } else {
            set({ initialized: true });
          }

          // Listen for auth state changes
          supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (event === 'SIGNED_IN' && session?.user) {
              try {
                const profile = await getUserProfile(session.user.id);
                set({
                  user: {
                    id: session.user.id,
                    email: session.user.email || '',
                    username: profile?.username || '',
                    full_name: profile?.full_name || '',
                    role: profile?.role || 'student',
                    student_id: profile?.student_id || null,
                    college_id: profile?.college_id || null,
                    major_id: profile?.major_id || null,
                    class_id: profile?.class_id || null,
                    enrollment_year: profile?.enrollment_year || null,
                    avatar_url: profile?.avatar_url || null,
                    created_at: profile?.created_at || '',
                    updated_at: profile?.updated_at || '',
                  },
                  isAuthenticated: true,
                });
              } catch (error) {
                console.error('Failed to fetch profile on auth change:', error);
              }
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                isAuthenticated: false,
              });
            } else if (event === 'TOKEN_REFRESHED') {
              // Token refresh is handled automatically by Supabase SDK
              console.log('Token refreshed');
            }
          });
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          set({ initialized: true });
        }
      },

      login: async (email, password) => {
        try {
          set({ isLoading: true });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            // Fetch user profile
            const profile = await getUserProfile(data.user.id);

            set({
              user: {
                id: data.user.id,
                email: data.user.email || '',
                username: profile?.username || '',
                full_name: profile?.full_name || '',
                role: profile?.role || 'student',
                student_id: profile?.student_id || null,
                college_id: profile?.college_id || null,
                major_id: profile?.major_id || null,
                class_id: profile?.class_id || null,
                enrollment_year: profile?.enrollment_year || null,
                avatar_url: profile?.avatar_url || null,
                created_at: profile?.created_at || '',
                updated_at: profile?.updated_at || '',
              },
              isAuthenticated: true,
            });

            toast.success('登录成功');
          }
        } catch (error: any) {
          const message = error.message || '登录失败';
          if (message.includes('Invalid login credentials')) {
            toast.error('邮箱或密码错误');
          } else if (message.includes('Email not confirmed')) {
            toast.error('请先验证邮箱');
          } else {
            toast.error(message);
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (registerData) => {
        try {
          set({ isLoading: true });

          const { email, password, username, full_name, role = 'student', college_id, major_id, class_id, enrollment_year } = registerData;

          // Sign up with Supabase Auth
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                full_name,
                role,
                college_id,
                major_id,
                class_id,
                enrollment_year,
              },
            },
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            // The profile will be created by database trigger
            // For students, student_id will be generated automatically
            toast.success('注册成功，请登录');
          }
        } catch (error: any) {
          const message = error.message || '注册失败';
          if (message.includes('User already registered')) {
            toast.error('该邮箱已被注册');
          } else if (message.includes('Password should be')) {
            toast.error('密码至少需要6位');
          } else {
            toast.error(message);
          }
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
          });
          toast.success('已登出');
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear local state even if API call fails
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const profile = await getUserProfile(user.id);
            set({
              user: {
                id: user.id,
                email: user.email || '',
                username: profile?.username || '',
                full_name: profile?.full_name || '',
                role: profile?.role || 'student',
                student_id: profile?.student_id || null,
                college_id: profile?.college_id || null,
                major_id: profile?.major_id || null,
                class_id: profile?.class_id || null,
                enrollment_year: profile?.enrollment_year || null,
                avatar_url: profile?.avatar_url || null,
                created_at: profile?.created_at || '',
                updated_at: profile?.updated_at || '',
              },
              isAuthenticated: true,
            });
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
        }
      },

      updateUser: async (data) => {
        try {
          const user = get().user;
          if (!user) {
            throw new Error('No user logged in');
          }

          // Update profile in database
          const { error } = await supabase
            .from('profiles')
            .update({
              username: data.username,
              full_name: data.full_name,
              avatar_url: data.avatar_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (error) {
            throw error;
          }

          // Update local state
          set({
            user: {
              ...user,
              ...data,
            },
          });

          toast.success('更新成功');
        } catch (error: any) {
          toast.error(error.message || '更新失败');
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper hook for using auth in components
export const useAuth = () => {
  const store = authStore();
  return store;
};

// Initialize auth on app load
export const initializeAuth = () => {
  authStore.getState().initialize();
};
