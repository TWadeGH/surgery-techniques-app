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
import { includeInAnalytics } from '../utils/helpers';

/**
 * Check if a user email matches any company contact
 * @param {string} email - User's email
 * @returns {Promise<{isRep: boolean, repCompanies: Array}>}
 */
async function checkRepAccess(email) {
  if (!email) return { isRep: false, repCompanies: [] };

  console.log('🔍 Checking rep access for email:', email);

  try {
    const { data, error } = await supabase
      .from('subspecialty_company_contacts')
      .select(`
        subspecialty_company_id,
        subspecialty_companies(
          id,
          company_name,
          subspecialty_id,
          subspecialties(name)
        )
      `)
      .eq('email', email.trim());

    if (error) {
      // Table might not exist yet - silently fail
      console.log('Rep access check skipped (table may not exist):', error.code);
      return { isRep: false, repCompanies: [] };
    }

    console.log('🔍 Rep access query result:', data);

    const repCompanies = (data || [])
      .filter(item => item.subspecialty_companies)
      .map(item => ({
        id: item.subspecialty_companies.id,
        companyName: item.subspecialty_companies.company_name,
        subspecialtyId: item.subspecialty_companies.subspecialty_id,
        subspecialtyName: item.subspecialty_companies.subspecialties?.name
      }));

    console.log('🔍 Rep companies found:', repCompanies);
    console.log('🔍 Is rep?', repCompanies.length > 0);

    return {
      isRep: repCompanies.length > 0,
      repCompanies
    };
  } catch (err) {
    console.warn('Error checking rep access:', err);
    return { isRep: false, repCompanies: [] };
  }
}

// Global flag to prevent duplicate auth subscriptions across all instances
// This is necessary because React Fast Refresh can cause multiple hook instances
let AUTH_SUBSCRIPTION_ACTIVE = false;

export function useAuth() {
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRep, setIsRep] = useState(false);
  const [repCompanies, setRepCompanies] = useState([]);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

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
          console.log('Profile found, returning it'); // Security: Removed PII (email)
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
      
      // Timeout after 5 seconds - profile should load quickly, if not, use minimal user
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.warn('Profile loading exceeded 5 second timeout - using minimal profile');
          reject(new Error('Profile loading timeout'));
        }, 5000) // 5 seconds - reasonable timeout
      );
      
      let profile;
      try {
        profile = await Promise.race([profileLoadPromise, timeoutPromise]);
      } catch (timeoutError) {
        // If timeout or error, continue with minimal user - don't block login
        console.warn('Profile load failed/timed out, continuing with minimal user');
        loadUserProfile.loading = false;
        loadUserProfile.loadingUserId = null;
        setLoading(false); // Ensure loading is false
        return; // Exit - user can still use app with minimal profile
      }
      
      // Profile loaded successfully - ALWAYS update state (don't check isMounted)
      // React Fast Refresh can cause false unmounts, but state updates still work
      
      // If profile is null (creation failed but non-critical), just return
      // User already has minimal profile from session
      if (!profile) {
        console.warn('Profile loading returned null - user will continue with minimal profile');
        return;
      }
      
      console.log('Profile received, transforming...', profile);
      
      // Security: Always use session email (most current) - profile email might be stale
      // Get fresh email from current session to ensure it's correct (especially for OAuth)
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      const userEmail = currentAuthUser?.email || profile.email || '';
      
      console.log('📧 Email sources:', {
        sessionEmail: currentAuthUser?.email,
        profileEmail: profile.email,
        usingEmail: userEmail
      });
      
      if (!userEmail) {
        console.warn('No email found in session or profile');
      }
      
      // Transform profile data to camelCase for consistency
      const transformedProfile = {
        id: profile.id,
        email: userEmail,
        userType: profile.user_type,
        role: profile.role,
        specialtyId: profile.primary_specialty_id,
        subspecialtyId: profile.primary_subspecialty_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        onboardingComplete: profile.onboarding_complete,
        termsAcceptedAt: profile.terms_accepted_at ?? null,
      };
      
      // Debug: Log profile data
      console.log('👤 User Profile Loaded:', {
        userId: profile.id?.substring(0, 8) + '...',
        specialtyId: profile.primary_specialty_id,
        subspecialtyId: profile.primary_subspecialty_id,
        email: profile.email?.substring(0, 10) + '...'
      });
      
      console.log('Profile loaded successfully, updating user'); // Security: Removed PII (email)
      
      // Update user state - use functional update to prevent infinite loops
      // Don't check isMounted here - React Fast Refresh can cause false unmounts
      setCurrentUser(prevUser => {
        // Only update if user ID matches or we don't have a user yet
        if (!prevUser || prevUser.id === transformedProfile.id) {
          console.log('✅ Updating user state with full profile'); // Security: Removed PII (email)
          return transformedProfile;
        }
        console.log('Skipping user update - user ID mismatch');
        return prevUser;
      });
      setError(null);
      setLoading(false); // Ensure loading is false after profile update
      console.log('✅ User state updated with profile successfully');
      
      // Initialize analytics session (Surgeon and Resident/Fellow only)
      try {
        if (includeInAnalytics(transformedProfile)) {
          initAnalyticsSession(userId, {
            specialtyId: transformedProfile.specialtyId,
            subspecialtyId: transformedProfile.subspecialtyId,
          });
        }
      } catch (analyticsError) {
        console.warn('Analytics initialization failed (non-blocking):', analyticsError);
      }

      // Check if user is a company rep (non-blocking)
      try {
        const repAccessResult = await checkRepAccess(userEmail);
        setIsRep(repAccessResult.isRep);
        setRepCompanies(repAccessResult.repCompanies);
        console.log('Rep access check:', repAccessResult.isRep ? 'User is a rep' : 'User is not a rep');
      } catch (repError) {
        console.warn('Rep access check failed (non-blocking):', repError);
        setIsRep(false);
        setRepCompanies([]);
      }
    } catch (err) {
        console.error('Error loading profile:', err);
        // Don't clear user on profile load error - keep minimal user
        setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
        setCurrentUser(prevUser => {
          if (!prevUser) {
            return null; // No user, so null is fine
          }
          // Keep existing minimal user - don't clear it on profile load error
          console.log('Profile load error, but keeping minimal user - user can still use app');
          return prevUser;
        });
        setLoading(false); // Always set loading to false, even on error
      } finally {
        loadUserProfile.loading = false;
        loadUserProfile.loadingUserId = null;
        setLoading(false); // Ensure loading is always false after profile load attempt
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
        // Always set loading to false immediately when no session
        setCurrentUser(null); // Explicitly clear user
        setLoading(false);
        if (sessionError) {
          setError(sessionError.message);
        }
        checkingSession.current = false;
        return;
      }
      
      // Session found - create minimal user immediately, load full profile in background
      console.log('Session found in checkSession - updating user immediately');
      // Always use session.email (most current) - update if email changed (OAuth case)
      setCurrentUser(prevUser => {
        if (!prevUser || prevUser.id !== session.user.id) {
          // New user or different user - create fresh
          return {
            id: session.user.id,
            email: session.user.email || '', // Always use current session email
            userType: 'student',
            role: 'user',
            specialtyId: null,
            subspecialtyId: null,
            onboardingComplete: false,
          };
        } else if (prevUser.email !== session.user.email) {
          // Same user but email changed (OAuth login) - update email
          return {
            ...prevUser,
            email: session.user.email || '', // Update to current session email
          };
        }
        // Same user, same email - no change needed
        return prevUser;
      });
      setLoading(false); // Show UI immediately
      
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
      // Always set loading to false on error - show login screen
      setLoading(false);
      setCurrentUser(null);
      setError(err.message || ERROR_MESSAGES.AUTH_ERROR);
      checkingSession.current = false;
    }
  }, [loadUserProfile]);

  /**
   * Handle auth state changes
   * Subscribes to Supabase auth events
   */
  useEffect(() => {
    // CRITICAL: Check global flag first to prevent duplicate subscriptions
    if (AUTH_SUBSCRIPTION_ACTIVE) {
      console.log('Auth subscription already active globally, skipping setup');
      return;
    }
    
    // CRITICAL: Prevent duplicate auth setup using ref
    if (authSetupStarted.current) {
      console.log('Auth already set up in this instance, skipping');
      return;
    }
    
    // Set both flags
    AUTH_SUBSCRIPTION_ACTIVE = true;
    authSetupStarted.current = true;
    console.log('Setting up auth for the first time (global flag set)');

    // Safety timeout - if session check takes too long, show login screen
    sessionCheckTimeout.current = setTimeout(() => {
      console.warn('Safety timeout reached (3s) - forcing loading to false');
      if (isMounted.current) {
        setLoading(false);
        // If no user after timeout, that's okay - show login screen
        if (!currentUser) {
          console.log('No user found after timeout - showing login screen');
        }
      }
    }, 3000); // 3 seconds - should be instant if no session

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
        
        // Handle password recovery - show reset password modal
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery detected - showing reset modal');
          setShowPasswordReset(true);
          setLoading(false);
          return;
        }

        // For SIGNED_OUT, check isMounted to prevent errors
        if (event === 'SIGNED_OUT') {
          if (!isMounted.current) return;
          console.log('User signed out');
          setCurrentUser(null);
          setLoading(false);
          setShowPasswordReset(false);
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
            const sessionEmail = session.user.email || '';
            const isTokenRefresh = event === 'TOKEN_REFRESHED';

            setCurrentUser(prevUser => {
              // TOKEN_REFRESHED: Keep existing full profile to avoid onboarding flash when
              // returning to the tab. Only update email if it changed.
              if (isTokenRefresh && prevUser?.id === session.user.id) {
                if (prevUser.email !== sessionEmail) {
                  return { ...prevUser, email: sessionEmail };
                }
                return prevUser;
              }
              // SIGNED_IN or new user: use minimal user until profile loads
              return {
                id: session.user.id,
                email: sessionEmail,
                userType: 'student',
                role: 'user',
                specialtyId: null,
                subspecialtyId: null,
                onboardingComplete: false,
              };
            });
            setLoading(false);

            // Load profile in background (refresh on TOKEN_REFRESHED, initial load on SIGNED_IN)
            setTimeout(() => {
              loadUserProfile(session.user.id).catch(() => {
                // Silent fail - user can still use app
              });
            }, isTokenRefresh ? 200 : 500);
          } else {
            console.warn('SIGNED_IN event but no session.user - this should not happen');
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
      console.log('Cleaning up auth subscription (resetting global flag)');
      AUTH_SUBSCRIPTION_ACTIVE = false; // Reset global flag
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
            prompt: 'select_account', // Force account selection every time
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
      if (updates.termsAcceptedAt !== undefined) dbUpdates.terms_accepted_at = updates.termsAcceptedAt;
      
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

  /**
   * Manually refresh session - useful after login if SIGNED_IN event is delayed
   */
  const refreshSession = useCallback(async () => {
    console.log('Manually refreshing session...');
    checkingSession.current = false; // Reset flag to allow check
    await checkSession();
  }, [checkSession]);

  return {
    // State
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser,
    isRep,
    repCompanies,
    showPasswordReset,
    closePasswordReset: () => setShowPasswordReset(false),

    // Methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
    refreshSession,
  };
}

export default useAuth;
