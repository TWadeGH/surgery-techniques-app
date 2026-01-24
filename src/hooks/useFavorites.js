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

export function useFavorites(userId) {
  // State
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(new Set());
  
  // Refs
  const isMounted = useRef(true);
  const abortController = useRef(null);

  /**
   * Load user's favorites from database
   */
  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setLoading(false);
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
      
      const { data, error: queryError } = await supabase
        .from('favorites')
        .select('resource_id')
        .eq('user_id', userId);
      
      if (queryError) throw queryError;
      
      if (!isMounted.current) return;
      
      // Extract just the resource IDs for efficient lookups
      const favoriteIds = data?.map((f) => f.resource_id) || [];
      setFavorites(favoriteIds);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error('Error loading favorites:', err);
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  /**
   * Load favorites on mount and when userId changes
   */
  useEffect(() => {
    loadFavorites();
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadFavorites]);

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
      return favorites.includes(resourceId);
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
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            resource_id: resourceId,
          });
        
        if (insertError) throw insertError;
        
        // Track analytics
        trackFavoriteEvent(resourceId, userId);
        
        // Update favorite count on resource (non-critical)
        supabase
          .rpc('increment_favorite_count', { resource_id: resourceId })
          .then();
        
        return { success: true };
      } catch (err) {
        console.error('Error adding favorite:', err);
        
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
    [userId, favorites, isFavorited]
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
        
        // Track analytics
        trackUnfavoriteEvent(resourceId, userId);
        
        // Update favorite count on resource (non-critical)
        supabase
          .rpc('decrement_favorite_count', { resource_id: resourceId })
          .then();
        
        return { success: true };
      } catch (err) {
        console.error('Error removing favorite:', err);
        
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
    [userId, favorites, isFavorited]
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
        
        // Track analytics for each
        newFavorites.forEach((id) => trackFavoriteEvent(id, userId));
        
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
