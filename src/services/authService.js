
/**
 * Authentication Service
 * Handles all authentication-related Supabase operations
 */

import { supabase } from '../lib/supabase';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function signInWithPassword(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Create profile for new user
    if (data.user) {
      await createUserProfile(data.user.id, email);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
}

/**
 * Sign in with OAuth provider (Google)
 * @param {string} provider - OAuth provider name
 * @param {string} redirectTo - Redirect URL after auth
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function signInWithOAuth(provider = 'google', redirectTo = null) {
  try {
    const options = {};
    if (redirectTo) {
      options.redirectTo = redirectTo;
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('OAuth sign in error:', error);
    return { data: null, error };
  }
}

/**
 * Sign out current user
 * @returns {Promise<{error: Error|null}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
}

/**
 * Get current session
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data: data.session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { data: null, error };
  }
}

/**
 * Get current user
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: data.user, error: null };
  } catch (error) {
    console.error('Get user error:', error);
    return { data: null, error };
  }
}

/**
 * Get user profile from profiles table
 * @param {string} userId - User ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { data: null, error };
  }
}

/**
 * Create user profile
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} additionalData - Additional profile data
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createUserProfile(userId, email, additionalData = {}) {
  try {
    const profileData = {
      id: userId,
      email,
      role: 'user',
      user_type: 'student',
      onboarding_completed: false,
      terms_accepted: false,
      ...additionalData,
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    // Check for duplicate key error (profile already exists)
    if (error.code === '23505') {
      console.log('Profile already exists, fetching existing profile');
      return await getUserProfile(userId);
    }
    
    console.error('Create user profile error:', error);
    return { data: null, error };
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function for auth state changes
 * @returns {Object} Subscription object
 */
export function onAuthStateChange(callback) {
  const { data: subscription } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>}
 */
export async function emailExists(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Reset password
 * @param {string} email - User email
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function resetPassword(email) {
  try {
    const { data, error} = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { data: null, error };
  }
}

/**
 * Update password
 * @param {string} newPassword - New password
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updatePassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { data: null, error };
  }
}
