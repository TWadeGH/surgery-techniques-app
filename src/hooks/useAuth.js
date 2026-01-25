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
  const authSetupStarted = useRef(false); // Prevent duplicate auth setup

  /**
   * Load user profile from database
   * Includes retry logic and profile creation fallback
   */
  const loadUserProfile = useCallback(async (userId) => {
    // Prevent multiple simultaneous profile loads for the same user
    if (loadUserProfile.loading && loadUserProfile.loadingUserId === userId) {
      console.log('Profile load already in progress for user:', userId);
      return;
    }
    loadUserProfile.loading = true;
    loadUserProfile.loadingUserId = userId;
    try {
      console.log('Loading profile for user:', userId);
      
      // Add timeout to profile loading with better error handling
      const profileLoadPromise = (async () => {
        console.log('Step 1: Fetching existing profile...');
        // First attempt - try to get existing profile with shorter timeout
        const fetchStart = Date.now();
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        const fetchTime = Date.now() - fetchStart;
        console.log(`Profile fetch took ${fetchTime}ms`, { profile: !!profile, error: error?.message });
        
        // If profile exists, return it immediately - don't try to create
        if (profile) {
          console.log('Profile found, returning it:', profile.email);
          return profile;
        }
        
        // Handle "not found" errors by creating profile
        if (!profile && (error?.code === 'PGRST116' || !error)) {
          console.log('Step 2: Profile not found, creating new profile...');
          // Get user data from auth (with timeout)
          const userStart = Date.now();
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('Error getting user:', userError);
            throw new Error('Failed to get user data: ' + userError.message);
          }
          
          if (!user || user.id !== userId) {
            throw new Error('User mismatch during profile creation');
          }
          
          console.log('Step 3: Upserting profile...');
          const upsertStart = Date.now();
          
          // Try INSERT first (faster), then fallback to upsert if needed
          let newProfile;
          let createError;
          
          // First try INSERT (faster for new profiles)
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user.email,
              user_type: 'student',
              role: 'user'
            })
            .select()
            .single();
          
          if (insertError) {
            console.log('Insert result:', { 
              code: insertError.code, 
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint
            });
            
            // 23505 = unique violation (already exists) - try to fetch existing
            if (insertError.code === '23505') {
              console.log('Profile already exists (duplicate), fetching...');
              const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              
              if (existingProfile) {
                profile = existingProfile;
                console.log('Fetched existing profile after duplicate error');
                return profile; // Return early, skip upsert
              } else if (fetchError) {
                console.error('Failed to fetch existing profile:', fetchError);
                throw new Error('Profile exists but could not be fetched: ' + fetchError.message);
              }
            }
            
            // If not a duplicate, try upsert as fallback
            console.log('Insert failed, trying upsert as fallback...', insertError.message);
            const upsertResult = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                email: user.email,
                user_type: 'student',
                role: 'user'
              }, {
                onConflict: 'id',
                ignoreDuplicates: false
              })
              .select()
              .single();
            
            newProfile = upsertResult.data;
            createError = upsertResult.error;
            
            if (createError) {
              console.error('Upsert also failed:', createError);
            }
          } else {
            newProfile = insertData;
            createError = null;
          }
          
          const upsertTime = Date.now() - upsertStart;
          console.log(`Profile upsert took ${upsertTime}ms`, { 
            error: createError?.message,
            code: createError?.code,
            details: createError?.details
          });
          
          if (createError) {
            console.error('Profile creation/upsert error:', {
              code: createError.code,
              message: createError.message,
              details: createError.details,
              hint: createError.hint
            });
            
            // If it's a duplicate, try to fetch the existing profile
            if (createError.code === '23505') {
              console.log('Profile already exists (duplicate), fetching...');
              const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              
              if (existingProfile) {
                profile = existingProfile;
                console.log('Fetched existing profile after duplicate error');
              } else if (fetchError) {
                console.error('Failed to fetch existing profile:', fetchError);
                throw new Error('Profile exists but could not be fetched: ' + fetchError.message);
              } else {
                throw new Error('Profile exists but could not be fetched (unknown error)');
              }
            } else {
              // For other errors, log but don't throw - user can still use app
              console.warn('Profile creation failed, but continuing with minimal profile:', createError.message);
              // Don't throw - let the app continue with minimal user
              return null; // Return null to indicate profile creation failed
            }
          } else {
            profile = newProfile;
            console.log('Profile created/upserted successfully');
          }
        } else if (error) {
          console.error('Profile fetch error:', error);
          throw error;
        }
        
        return profile;
      })();
      
      // No aggressive timeout - profile fetch is fast (167ms in logs)
      // Only timeout if it's truly stuck (30 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('Profile loading exceeded 30 second timeout - this should not happen');
          reject(new Error('Profile loading timeout - database may be unreachable'));
        }, 30000) // 30 seconds - only for truly stuck cases
      );
      
      const profile = await Promise.race([profileLoadPromise, timeoutPromise]);
      
      if (!isMounted.current) {
        console.log('Component unmounted, skipping profile update');
        return;
      }
      
      // If profile is null (creation failed but non-critical), just return
      // User already has minimal profile from session
      if (!profile) {
        console.warn('Profile loading returned null - user will continue with minimal profile');
        return;
      }
      
      console.log('Profile received, transforming...', profile);
      
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
      
      console.log('Profile loaded successfully, updating user:', transformedProfile.email);
      
      // Only update if component is still mounted and user ID matches
      if (isMounted.current) {
        // Use functional update to prevent infinite loops
        setCurrentUser(prevUser => {
          // Only update if user ID matches or we don't have a user yet
          if (!prevUser || prevUser.id === transformedProfile.id) {
            console.log('Updating user state with profile');
            return transformedProfile;
          }
          console.log('Skipping user update - user ID mismatch');
          return prevUser;
        });
        setError(null);
        console.log('User state updated with profile');
      } else {
        console.log('Component unmounted, skipping profile update');
      }
      
      // Initialize analytics session
      try {
        initAnalyticsSession(userId, {
          specialtyId: transformedProfile.specialtyId,
          subspecialtyId: transformedProfile.subspecialtyId,
        });
      } catch (analyticsError) {
        console.warn('Analytics initialization failed (non-blocking):', analyticsError);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
        // Don't set currentUser to null if we already have a minimal user
        // Only clear if we don't have any user at all
        setCurrentUser(prevUser => {
          if (!prevUser) {
            return null; // No user, so null is fine
          }
          // Keep existing minimal user - don't clear it on profile load error
          console.log('Profile load error, but keeping minimal user');
          return prevUser;
        });
      }
      } finally {
        loadUserProfile.loading = false;
        loadUserProfile.loadingUserId = null;
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }, []);

  /**
   * Check for existing session on mount
   * Includes timeout for fast failure on network issues
   */
  // Use ref to prevent multiple simultaneous session checks
  const checkingSession = useRef(false);
  
  const checkSession = useCallback(async () => {
    if (checkingSession.current) {
      console.log('Session check already in progress, skipping...');
      return;
    }
    checkingSession.current = true;
    try {
      console.log('Checking session...');
      // No artificial timeout - let Supabase handle it naturally
      // Session checks are usually fast (< 500ms), but don't force a timeout
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.log('No session found - showing login screen immediately');
        if (isMounted.current) {
          setLoading(false);
          if (sessionError) {
            setError(sessionError.message);
          }
        }
        return;
      }
      
      // Session found - create minimal user immediately, load full profile in background
      console.log('Session found, creating minimal user and loading profile in background:', session.user.id);
      if (isMounted.current) {
        // Only set user if we don't already have one (prevent infinite loops)
        if (!currentUser || currentUser.id !== session.user.id) {
          // Create minimal user object from session so app can render immediately
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            userType: 'student',
            role: 'user',
            specialtyId: null,
            subspecialtyId: null,
            onboardingComplete: false,
          });
        }
        setLoading(false); // Show UI immediately
      }
      
      // Load full profile in background (completely non-blocking)
      // Use setTimeout to ensure it doesn't block the render
      setTimeout(() => {
        loadUserProfile(session.user.id).catch(err => {
          console.error('Background profile load failed (non-critical):', err);
          // User can still use app with minimal profile - profile will load eventually
        });
      }, 100); // Small delay to ensure UI renders first
    } catch (err) {
      console.error('Error checking session:', err);
      if (isMounted.current) {
        setLoading(false);
        setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
      }
    } finally {
      checkingSession.current = false;
    }
  }, [loadUserProfile]);

  /**
   * Handle auth state changes
   * Subscribes to Supabase auth events
   */
  useEffect(() => {
    // CRITICAL: Prevent duplicate auth setup using ref
    if (authSetupStarted.current) {
      console.log('Auth already set up, skipping duplicate setup');
      return;
    }
    authSetupStarted.current = true;
    console.log('Setting up auth for the first time');

    // Don't set a safety timeout initially - let checkSession handle it
    // Only set timeout if checkSession hasn't completed after 10 seconds
    sessionCheckTimeout.current = setTimeout(() => {
      console.warn('Safety timeout reached (10s) - forcing loading to false');
      if (isMounted.current && loading) {
        setLoading(false);
        // If no user after timeout, that's okay - show login screen
        if (!currentUser) {
          console.log('No user found after timeout - showing login screen');
        }
      }
    }, 10000); // 10 seconds - only for truly stuck cases

    // Initial session check
    console.log('Starting initial session check...');
    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Clear safety timeout
        if (sessionCheckTimeout.current) {
          clearTimeout(sessionCheckTimeout.current);
        }
        
        if (!isMounted.current) return;
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setCurrentUser(null);
          setLoading(false);
          endAnalyticsSession();
        } else if (event === 'INITIAL_SESSION') {
          // INITIAL_SESSION fires on mount - handle it like a session check
          console.log('Initial session event:', session?.user?.id ? 'Session found' : 'No session');
          if (session?.user) {
            // We have a session - create minimal user and load profile
            // Use functional update to prevent loops
            setCurrentUser(prevUser => {
              if (!prevUser || prevUser.id !== session.user.id) {
                console.log('Creating minimal user from INITIAL_SESSION');
                return {
                  id: session.user.id,
                  email: session.user.email || '',
                  userType: 'student',
                  role: 'user',
                  specialtyId: null,
                  subspecialtyId: null,
                  onboardingComplete: false,
                };
              }
              console.log('User already exists from INITIAL_SESSION, skipping');
              return prevUser;
            });
            // Only set loading to false if we're still loading
            setLoading(prevLoading => {
              if (prevLoading) {
                console.log('Setting loading to false after INITIAL_SESSION');
                return false;
              }
              return prevLoading;
            });
            // Load profile in background - only if not already loading
            setTimeout(() => {
              loadUserProfile(session.user.id).catch(err => {
                console.error('Background profile load failed:', err);
              });
            }, 200);
          } else {
            // No session - show login screen
            console.log('No session in INITIAL_SESSION - showing login');
            setLoading(false);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('User signed in, creating minimal user and loading profile in background...');
            // Create minimal user immediately from session data
            if (isMounted.current) {
              // Use functional update to prevent infinite loops
              setCurrentUser(prevUser => {
                // Only update if we don't already have a user (prevent duplicate calls)
                if (!prevUser || prevUser.id !== session.user.id) {
                  console.log('Creating minimal user from SIGNED_IN event');
                  return {
                    id: session.user.id,
                    email: session.user.email || '',
                    userType: 'student',
                    role: 'user',
                    specialtyId: null,
                    subspecialtyId: null,
                    onboardingComplete: false,
                  };
                }
                console.log('User already exists from SIGNED_IN event, skipping');
                return prevUser;
              });
              // Use functional update for loading too
              setLoading(prevLoading => {
                if (prevLoading) {
                  console.log('Setting loading to false after SIGNED_IN');
                  return false;
                }
                return prevLoading;
              });
            }
            // Load full profile in background (non-blocking) - only if not already loading
            setTimeout(() => {
              loadUserProfile(session.user.id).catch(err => {
                console.error('Background profile load failed:', err);
                // User can still use app with minimal profile
              });
            }, 200); // Small delay to prevent duplicate calls
          }
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            console.log('User updated, reloading profile in background...');
            // Non-blocking profile reload - only if user matches
            if (!currentUser || currentUser.id === session.user.id) {
              setTimeout(() => {
                loadUserProfile(session.user.id).catch(err => {
                  console.error('Background profile reload failed:', err);
                });
              }, 200);
            }
          }
        }
      }
    );
    
    authSubscription.current = subscription;

    // Cleanup
    return () => {
      console.log('Cleaning up auth subscription');
      isMounted.current = false;
      authSetupStarted.current = false; // Reset so it can be set up again if needed
      if (sessionCheckTimeout.current) {
        clearTimeout(sessionCheckTimeout.current);
      }
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
      }
      endAnalyticsSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, checkSession and loadUserProfile are stable

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
      // Don't set loading - OAuth redirects away, so loading state doesn't matter
      setError(null);
      
      console.log('Initiating Google OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated, redirecting...');
      // Note: This will redirect away, so we won't return here
      return { success: true, data };
    } catch (err) {
      console.error('Google sign in error:', err);
      const errorMessage = err.message || ERROR_MESSAGES.AUTH_ERROR;
      setError(errorMessage);
      // Don't set loading to false - let the redirect handle it
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
