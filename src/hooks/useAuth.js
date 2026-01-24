/**
 * useAuth Hook
 * 
 * Manages authentication state, session persistence, and user profile data.
 * Provides a clean interface for auth operations throughout the application.
 * 
 * @example
 * const { currentUser, loading, signIn, signOut, updateProfile } = useAuth();
 * 
 * Features:
 * - Automatic session restoration on mount
 * - Real-time auth state synchronization
 * - Profile data loading with caching
 * - Error handling with user-friendly messages
 * - Loading states for all operations
 * - Cleanup on unmount
 * 
 * @returns {Object} Auth state and methods
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { initAnalyticsSession, endAnalyticsSession } from '../lib/analytics';
import { ERROR_MESSAGES } from '../utils/constants';

export function useAuth() {
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for cleanup and race condition prevention
  const isMounted = useRef(true);
  const authSubscription = useRef(null);
  const sessionCheckTimeout = useRef(null);

  /**
   * Load user profile from database
   * Includes retry logic and profile creation fallback
   */
  const loadUserProfile = useCallback(async (userId) => {
    try {
      console.log('Loading profile for user:', userId);
      
      // First attempt - try to get existing profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // Handle "not found" errors by creating profile
      if (!profile && (error?.code === 'PGRST116' || !error)) {
        console.log('Profile not found, attempting to create...');
        
        // Get user data from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || user.id !== userId) {
          throw new Error('User mismatch during profile creation');
        }
        
        // Create new profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: user.email,
            user_type: 'student', // Default type
            role: 'user'
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();
        
        if (createError) throw createError;
        profile = newProfile;
      } else if (error) {
        throw error;
      }
      
      if (!isMounted.current) return;
      
      // Transform profile data to camelCase for consistency
      const transformedProfile = {
        id: profile.id,
        email: profile.email,
        userType: profile.user_type,
        role: profile.role,
        specialtyId: profile.primary_specialty_id,
        subspecialtyId: profile.primary_subspecialty_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        onboardingComplete: profile.onboarding_complete,
      };
      
      setCurrentUser(transformedProfile);
      setError(null);
      
      // Initialize analytics session
      initAnalyticsSession(userId, {
        specialtyId: transformedProfile.specialtyId,
        subspecialtyId: transformedProfile.subspecialtyId,
      });
      
      console.log('Profile loaded successfully');
    } catch (err) {
      console.error('Error loading profile:', err);
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
        setCurrentUser(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Check for existing session on mount
   * Includes timeout for fast failure on network issues
   */
  const checkSession = useCallback(async () => {
    try {
      console.log('Checking for existing session...');
      
      // Race condition: timeout vs session check
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 3000)
      );
      
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      const { data: { session }, error: sessionError } = result;
      
      if (sessionError) {
        console.error('Session check error:', sessionError);
        if (isMounted.current) {
          setLoading(false);
          setError(sessionError.message);
        }
        return;
      }
      
      if (session?.user) {
        console.log('Session found, loading profile...');
        await loadUserProfile(session.user.id);
      } else {
        console.log('No active session');
        if (isMounted.current) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
      if (isMounted.current) {
        setLoading(false);
        setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
      }
    }
  }, [loadUserProfile]);

  /**
   * Handle auth state changes
   * Subscribes to Supabase auth events
   */
  useEffect(() => {
    // Safety timeout to prevent infinite loading
    sessionCheckTimeout.current = setTimeout(() => {
      console.warn('Session check timeout reached');
      if (isMounted.current && loading) {
        setLoading(false);
      }
    }, 5000);

    // Initial session check
    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // Clear safety timeout
        if (sessionCheckTimeout.current) {
          clearTimeout(sessionCheckTimeout.current);
        }
        
        if (!isMounted.current) return;
        
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setLoading(false);
          endAnalyticsSession();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            await loadUserProfile(session.user.id);
          }
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            await loadUserProfile(session.user.id);
          }
        }
      }
    );
    
    authSubscription.current = subscription;

    // Cleanup
    return () => {
      isMounted.current = false;
      if (sessionCheckTimeout.current) {
        clearTimeout(sessionCheckTimeout.current);
      }
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
      endAnalyticsSession();
    };
  }, [checkSession, loadUserProfile, loading]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Profile will be loaded by onAuthStateChange
      return { success: true, data };
    } catch (err) {
      console.error('Sign in error:', err);
      const errorMessage = err.message || ERROR_MESSAGES.AUTH_ERROR;
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Create profile if user was created
      if (data.user) {
        await loadUserProfile(data.user.id);
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('Sign up error:', err);
      const errorMessage = err.message || ERROR_MESSAGES.AUTH_ERROR;
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [loadUserProfile]);

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error('Google sign in error:', err);
      const errorMessage = err.message || ERROR_MESSAGES.AUTH_ERROR;
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      endAnalyticsSession();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setCurrentUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Sign out error:', err);
      const errorMessage = err.message || ERROR_MESSAGES.AUTH_ERROR;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    if (!currentUser?.id) {
      return { success: false, error: 'No user logged in' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Transform camelCase to snake_case for database
      const dbUpdates = {};
      if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
      if (updates.specialtyId !== undefined) dbUpdates.primary_specialty_id = updates.specialtyId;
      if (updates.subspecialtyId !== undefined) dbUpdates.primary_subspecialty_id = updates.subspecialtyId;
      if (updates.onboardingComplete !== undefined) dbUpdates.onboarding_complete = updates.onboardingComplete;
      
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      // Reload profile
      await loadUserProfile(currentUser.id);
      
      return { success: true };
    } catch (err) {
      console.error('Update profile error:', err);
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadUserProfile]);

  /**
   * Refresh current user profile
   */
  const refreshProfile = useCallback(async () => {
    if (!currentUser?.id) return;
    await loadUserProfile(currentUser.id);
  }, [currentUser, loadUserProfile]);

  return {
    // State
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser,
    
    // Methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
  };
}

export default useAuth;
