/**
 * Auth API - Supabase Auth Integration
 *
 * Most auth operations are now handled directly by Supabase Auth in authStore.ts
 * This file provides additional helper functions for compatibility.
 */

import { supabase } from './supabase';

// Change password
export const changePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw error;
  }
};

// Update password with reset token (for password reset flow)
export const updatePasswordWithToken = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
};

// Get current session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
};

// Check if email exists (for registration validation)
export const checkEmailExists = async (email: string): Promise<boolean> => {
  // This is a workaround - Supabase doesn't have a direct API for this
  // We'll check the profiles table instead
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single();

  if (error && error.code === 'PGRST116') {
    // Not found error - email doesn't exist
    return false;
  }

  return !!data;
};

// Update user profile
export const updateProfile = async (profileData: {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw error;
  }
};

// Export a named object for compatibility with existing code
export const authAPI = {
  changePassword,
  requestPasswordReset,
  updatePasswordWithToken,
  getSession,
  getCurrentUser,
  checkEmailExists,
  updateProfile,
};

export default authAPI;
