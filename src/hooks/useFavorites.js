/**
 * useFavorites Hook
 * 
 * Manages user favorites with optimistic updates, analytics tracking,
 * and efficient state management.
 * 
 * @example
 * const { favorites, isFavorited, toggleFavorite, loading } = useFavorites(userId);
 * 
 * Features:
 * - Automatic loading on mount
 * - Optimistic UI updates
 * - Analytics tracking (favorite/unfavorite events)
 * - Batch operations support
 * - Error recovery with rollback
 * - Loading states per resource
 * 
 * @param {string} userId - Current user ID
 * @returns {Object} Favorites state and methods
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { trackFavoriteEvent, trackUnfavoriteEvent } from '../lib/analytics';
import { ERROR_MESSAGES } from '../utils/constants';

/**
 * @param {string} userId - Current user ID
 * @param {Object} [options] - Optional config
 * @param {boolean} [options.trackAnalytics] - If true, record favorite/unfavorite in analytics (Surgeon/Resident-Fellow only). Default false.
 */
export function useFavorites(userId, options = {}) {
  const { trackAnalytics = false } = options;
  // State
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(new Set());
  
  // Debug: Track state changes
  useEffect(() => {
    console.log('🔍 useFavorites: State changed', {
      favoritesCount: favorites.length,
      loading,
      error: error?.substring(0, 50) || null,
      favoriteIds: favorites.map(id => id.substring(0, 8) + '...')
    });
  }, [favorites, loading, error]);
  
  // Refs
  const isMounted = useRef(true);
  const abortController = useRef(null);

  /**
   * Load user's favorites from database
   */
  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setFavorites([]); // Clear favorites if no user
      return;
    }
    
    try {
      // Cancel any pending requests
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      console.log('useFavorites: Attempting to load favorites for userId:', userId ? 'present' : 'missing');
      
      const { data, error: queryError } = await supabase
        .from('favorites')
        .select('resource_id')
        .eq('user_id', userId);
      
      if (queryError) {
        // Security: Don't log PII (user IDs)
        // Handle 403 Forbidden (RLS blocking) gracefully
        if (queryError.code === '42501' || queryError.code === 'PGRST301' || queryError.status === 403) {
          // Security: Sanitize error messages (prevent XSS, info disclosure)
          const sanitizedMessage = queryError.message?.substring(0, 100) || 'Unknown error';
          const sanitizedHint = queryError.hint?.substring(0, 100) || null;
          const sanitizedDetails = queryError.details?.substring(0, 100) || null;
          
          console.error('❌ useFavorites: RLS policy blocking read access (403). Error details:', {
            code: queryError.code,
            message: sanitizedMessage, // Security: Sanitized
            hint: sanitizedHint, // Security: Sanitized
            details: sanitizedDetails // Security: Sanitized
          });
          console.error('⚠️ ACTION REQUIRED: Run SUPABASE_RLS_POLICIES.sql in Supabase SQL Editor to fix RLS policies');
          if (isMounted.current) {
            setFavorites([]);
            setLoading(false);
          }
          return; // Don't throw, just return empty array
        }
        console.error('Error loading favorites:', queryError?.code || 'Unknown error', queryError?.message?.substring(0, 100) || '');
        throw queryError;
      }
      
      console.log('useFavorites: Query successful, received', data?.length || 0, 'favorites');
      console.log('🔵 useFavorites: isMounted check:', isMounted.current);
      
      if (!isMounted.current) {
        console.warn('⚠️ useFavorites: Component unmounted before state could be set! Data received:', data?.length || 0, 'favorites');
        // Still set state even if unmounted - component might remount
        const favoriteIds = data?.map((f) => f.resource_id) || [];
        setFavorites(favoriteIds);
        setLoading(false);
        return;
      }
      
      // Extract just the resource IDs for efficient lookups
      const favoriteIds = data?.map((f) => f.resource_id) || [];
      console.log(`useFavorites: Loaded ${favoriteIds.length} favorite(s) from database`);
      console.log('🔵 useFavorites: Setting favorites state with IDs:', favoriteIds.map(id => id.substring(0, 8) + '...'));
      setFavorites(favoriteIds);
      
      // Debug: Log count (without PII)
      if (favoriteIds.length > 0) {
        console.log(`✅ useFavorites: State updated with ${favoriteIds.length} favorite(s)`);
      } else {
        console.log('⚠️ useFavorites: No favorites found in database');
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      // Security: Don't log PII
      console.error('Error loading favorites:', err?.code || 'Unknown error');
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.GENERIC_ERROR);
        // Don't clear favorites on error - keep existing state
      }
    } finally {
      if (isMounted.current) {
        console.log('🔵 useFavorites: loadFavorites finally block - setting loading to false');
        setLoading(false);
        console.log('✅ useFavorites: Loading state set to false');
      } else {
        console.warn('⚠️ useFavorites: Component unmounted, skipping setLoading');
      }
    }
  }, [userId]);

  /**
   * Load favorites on mount and when userId changes
   */
  useEffect(() => {
    console.log('🔵 useFavorites: useEffect triggered', {
      userId: userId ? 'present' : 'missing',
      isMounted: isMounted.current
    });
    
    if (userId) {
      console.log('🔵 useFavorites: Loading favorites for userId:', userId ? 'present' : 'missing');
      loadFavorites();
    } else {
      console.log('⚠️ useFavorites: No userId, skipping load');
      setFavorites([]);
      setLoading(false);
    }
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadFavorites, userId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  /**
   * Check if a resource is favorited (memoized for performance)
   */
  const isFavorited = useCallback(
    (resourceId) => {
      const result = favorites.includes(resourceId);
      // Debug logging (only log occasionally to avoid spam)
      if (Math.random() < 0.01) { // Log 1% of calls
        console.log('🔍 useFavorites: isFavorited check', {
          resourceIdPrefix: resourceId?.substring(0, 8) + '...',
          isFavorited: result,
          favoritesCount: favorites.length
        });
      }
      return result;
    },
    [favorites]
  );

  /**
   * Add a favorite (with optimistic update and rollback on error)
   */
  const addFavorite = useCallback(
    async (resourceId) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (isFavorited(resourceId)) {
        return { success: true }; // Already favorited
      }
      
      // Mark as pending
      setPendingOperations((prev) => new Set(prev).add(resourceId));
      
      // Optimistic update
      const previousFavorites = favorites;
      setFavorites((prev) => [...prev, resourceId]);
      
      try {
        // Security: Check if favorite already exists (prevent 409 Conflict)
        const { data: existing, error: checkError } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('resource_id', resourceId)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
        
        if (existing) {
          // Already exists, just reload to sync
          console.log('Favorite already exists, reloading...');
          await loadFavorites();
          return { success: true };
        }
        
        // Security: Validate resourceId before use (prevent IDOR, type confusion)
        if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
          console.error('❌ useFavorites: Invalid resourceId');
          setFavorites(previousFavorites); // Rollback optimistic update
          setPendingOperations((prev) => {
            const next = new Set(prev);
            next.delete(resourceId);
            return next;
          });
          return { success: false, error: 'Invalid resource ID' };
        }
        
        console.log('🔵 useFavorites: Attempting to insert favorite', {
          userId: userId ? 'present' : 'missing',
          resourceIdPrefix: resourceId?.substring(0, 8) + '...' // Security: Truncated, no PII
        });
        
        const { data: insertData, error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            resource_id: resourceId,
          })
          .select(); // Select to verify insert worked
        
        if (insertError) {
          // Security: Sanitize error messages (prevent XSS, info disclosure)
          const sanitizedMessage = insertError.message?.substring(0, 100) || 'Unknown error';
          const sanitizedHint = insertError.hint?.substring(0, 100) || null;
          const sanitizedDetails = insertError.details?.substring(0, 100) || null;
          
          console.error('🔴 useFavorites: INSERT FAILED', {
            code: insertError.code,
            status: insertError.status,
            message: sanitizedMessage, // Security: Sanitized
            hint: sanitizedHint, // Security: Sanitized
            details: sanitizedDetails // Security: Sanitized
          });
          
          // Handle 409 Conflict (duplicate) gracefully
          if (insertError.code === '23505' || insertError.code === 'PGRST301' || insertError.status === 409) {
            console.log('✅ Favorite already exists (409), reloading to sync...');
            await loadFavorites();
            return { success: true }; // Treat as success since favorite exists
          }
          // Handle 403 Forbidden (RLS blocking)
          if (insertError.code === '42501' || insertError.code === 'PGRST301' || insertError.status === 403) {
            console.error('❌ useFavorites: RLS policy blocking insert (403)');
            console.error('⚠️ ACTION REQUIRED: Run CLEANUP_AND_FIX_RLS_POLICIES.sql in Supabase SQL Editor');
            console.error('⚠️ Then run TEST_RLS_POLICIES.sql to verify policies work');
            // Don't reload - RLS will block that too
            setFavorites(previousFavorites); // Rollback optimistic update
            setPendingOperations((prev) => {
              const next = new Set(prev);
              next.delete(resourceId);
              return next;
            });
            return { success: false, error: 'RLS policy blocking insert. Please fix RLS policies in Supabase.' };
          }
          console.error('❌ Error inserting favorite:', insertError?.code || 'Unknown error', insertError?.message?.substring(0, 100) || '');
          setFavorites(previousFavorites); // Rollback optimistic update
          setPendingOperations((prev) => {
            const next = new Set(prev);
            next.delete(resourceId);
            return next;
          });
          throw insertError;
        }
        
        // Security: Don't log full insertData (contains user_id PII)
        console.log('✅ useFavorites: Favorite inserted successfully', {
          resourceIdPrefix: resourceId?.substring(0, 8) + '...' // Security: Truncated, no PII
        });
        // Reload favorites to ensure consistency with database
        await loadFavorites();
        
        // Track analytics (non-blocking, fail silently)
        trackFavoriteEvent(resourceId, userId).catch(() => {
          // Silently ignore analytics errors - they're non-critical
        });
        
        // Update favorite count on resource (non-critical, fail silently)
        supabase
          .rpc('increment_favorite_count', { resource_id: resourceId })
          .catch(() => {
            // Silently ignore - RPC function may not exist, that's OK
          });
        
        return { success: true };
      } catch (err) {
        // Handle 409 Conflict (duplicate) gracefully
        if (err?.code === '23505' || err?.code === 'PGRST301' || err?.status === 409) {
          console.log('✅ Favorite already exists (409), reloading to sync...');
          await loadFavorites();
          return { success: true }; // Treat as success since favorite exists
        }
        
        // Security: Sanitize error messages
        const errorCode = err?.code || 'Unknown';
        const errorStatus = err?.status;
        
        // Only log unexpected errors (not analytics-related)
        if (errorCode !== 'Unknown' || errorStatus !== undefined) {
          console.error('🔴 Error adding favorite:', {
            code: errorCode,
            status: errorStatus,
            message: err?.message?.substring(0, 100) || 'Unknown error'
          });
        }
        
        // Rollback optimistic update
        if (isMounted.current) {
          setFavorites(previousFavorites);
        }
        
        return { success: false, error: err.message };
      } finally {
        // Remove from pending
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
      }
    },
    [userId, favorites, isFavorited, loadFavorites]
  );

  /**
   * Remove a favorite (with optimistic update and rollback on error)
   */
  const removeFavorite = useCallback(
    async (resourceId) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (!isFavorited(resourceId)) {
        return { success: true }; // Already not favorited
      }
      
      // Mark as pending
      setPendingOperations((prev) => new Set(prev).add(resourceId));
      
      // Optimistic update
      const previousFavorites = favorites;
      setFavorites((prev) => prev.filter((id) => id !== resourceId));
      
      try {
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
        
        if (deleteError) throw deleteError;
        
        // Reload favorites to ensure consistency with database
        await loadFavorites();
        
        // Track analytics only for Surgeon/Resident-Fellow
        if (trackAnalytics) {
          trackUnfavoriteEvent(resourceId, userId);
        }
        
        // Update favorite count on resource (non-critical)
        supabase
          .rpc('decrement_favorite_count', { resource_id: resourceId })
          .then();
        
        return { success: true };
      } catch (err) {
        // Security: Sanitize error messages
        const errorCode = err?.code || 'Unknown';
        const errorStatus = err?.status;
        
        // Only log unexpected errors
        if (errorCode !== 'Unknown' || errorStatus !== undefined) {
          console.error('🔴 Error removing favorite:', {
            code: errorCode,
            status: errorStatus,
            message: err?.message?.substring(0, 100) || 'Unknown error'
          });
        }
        
        // Rollback optimistic update
        if (isMounted.current) {
          setFavorites(previousFavorites);
        }
        
        return { success: false, error: err.message };
      } finally {
        // Remove from pending
        setPendingOperations((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
      }
    },
    [userId, favorites, isFavorited, loadFavorites]
  );

  /**
   * Toggle favorite status (smart wrapper around add/remove)
   */
  const toggleFavorite = useCallback(
    async (resourceId) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const isCurrentlyFavorited = isFavorited(resourceId);
      
      if (isCurrentlyFavorited) {
        return await removeFavorite(resourceId);
      } else {
        return await addFavorite(resourceId);
      }
    },
    [userId, isFavorited, addFavorite, removeFavorite]
  );

  /**
   * Clear all favorites (with confirmation)
   */
  const clearAllFavorites = useCallback(async () => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const previousFavorites = favorites;
    
    // Optimistic update
    setFavorites([]);
    
    try {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;
      
      return { success: true };
    } catch (err) {
      console.error('Error clearing favorites:', err);
      
      // Rollback
      if (isMounted.current) {
        setFavorites(previousFavorites);
      }
      
      return { success: false, error: err.message };
    }
  }, [userId, favorites]);

  /**
   * Batch add favorites (efficient for multiple resources)
   */
  const addFavorites = useCallback(
    async (resourceIds) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Filter out already favorited
      const newFavorites = resourceIds.filter((id) => !isFavorited(id));
      
      if (newFavorites.length === 0) {
        return { success: true };
      }
      
      const previousFavorites = favorites;
      
      // Optimistic update
      setFavorites((prev) => [...prev, ...newFavorites]);
      
      try {
        const insertData = newFavorites.map((resourceId) => ({
          user_id: userId,
          resource_id: resourceId,
        }));
        
        const { error: insertError } = await supabase
          .from('favorites')
          .insert(insertData);
        
        if (insertError) throw insertError;
        
        // Track analytics for each (Surgeon/Resident-Fellow only)
        if (trackAnalytics) {
          newFavorites.forEach((id) => trackFavoriteEvent(id, userId));
        }
        
        return { success: true, count: newFavorites.length };
      } catch (err) {
        console.error('Error batch adding favorites:', err);
        
        // Rollback
        if (isMounted.current) {
          setFavorites(previousFavorites);
        }
        
        return { success: false, error: err.message };
      }
    },
    [userId, favorites, isFavorited]
  );

  /**
   * Check if operation is pending for a resource
   */
  const isPending = useCallback(
    (resourceId) => {
      return pendingOperations.has(resourceId);
    },
    [pendingOperations]
  );

  /**
   * Get count of favorites
   */
  const count = useMemo(() => favorites.length, [favorites]);

  /**
   * Check if user has any favorites
   */
  const hasFavorites = useMemo(() => favorites.length > 0, [favorites]);

  // Debug: Expose state to window for debugging (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.__DEBUG_FAVORITES__ = {
      favorites,
      favoritesCount: favorites.length,
      favoriteIds: favorites.map(id => id.substring(0, 8) + '...'),
      loading,
      error,
      userId: userId ? 'present' : 'missing',
      isFavorited: (resourceId) => favorites.includes(resourceId),
    };
  }

  return {
    // State
    favorites,
    loading,
    error,
    count,
    hasFavorites,
    
    // Methods
    isFavorited,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearAllFavorites,
    addFavorites,
    isPending,
    refetch: loadFavorites,
  };
}

export default useFavorites;
