/**
 * useUpcomingCases Hook
 * 
 * Manages user's upcoming surgical cases with drag-and-drop reordering,
 * optimistic updates, and analytics tracking.
 * 
 * @example
 * const { upcomingCases, addCase, removeCase, reorderCases } = useUpcomingCases(userId);
 * 
 * Features:
 * - Drag-and-drop reordering
 * - Optimistic UI updates
 * - Analytics tracking
 * - Efficient state management
 * - Loading states
 * - Error handling with rollback
 * 
 * @param {string} userId - Current user ID
 * @returns {Object} Upcoming cases state and methods
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { trackUpcomingCaseEvent } from '../lib/analytics';
import { ERROR_MESSAGES } from '../utils/constants';

export function useUpcomingCases(userId) {
  // State - Array of {resource_id, display_order}
  const [upcomingCases, setUpcomingCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOperations, setPendingOperations] = useState(new Set());
  
  // Refs
  const isMounted = useRef(true);
  const abortController = useRef(null);

  /**
   * Load user's upcoming cases from database
   */
  const loadUpcomingCases = useCallback(async () => {
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
        .from('upcoming_cases')
        .select('resource_id, display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      if (queryError) throw queryError;
      
      if (!isMounted.current) return;
      
      setUpcomingCases(data || []);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error('Error loading upcoming cases:', err);
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
   * Load upcoming cases on mount and when userId changes
   */
  useEffect(() => {
    loadUpcomingCases();
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadUpcomingCases]);

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
   * Check if a resource is in upcoming cases
   */
  const isInUpcomingCases = useCallback(
    (resourceId) => {
      return upcomingCases.some((c) => c.resource_id === resourceId);
    },
    [upcomingCases]
  );

  /**
   * Get display order for a resource
   */
  const getDisplayOrder = useCallback(
    (resourceId) => {
      const caseItem = upcomingCases.find((c) => c.resource_id === resourceId);
      return caseItem?.display_order ?? -1;
    },
    [upcomingCases]
  );

  /**
   * Add a resource to upcoming cases
   */
  const addCase = useCallback(
    async (resourceId, categoryId = null) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (isInUpcomingCases(resourceId)) {
        return { success: true }; // Already in upcoming cases
      }
      
      // Mark as pending
      setPendingOperations((prev) => new Set(prev).add(resourceId));
      
      // Calculate new display order (add to end)
      const newDisplayOrder = upcomingCases.length;
      
      // Optimistic update
      const previousCases = upcomingCases;
      setUpcomingCases((prev) => [
        ...prev,
        { resource_id: resourceId, display_order: newDisplayOrder },
      ]);
      
      try {
        const { error: insertError } = await supabase
          .from('upcoming_cases')
          .insert({
            user_id: userId,
            resource_id: resourceId,
            display_order: newDisplayOrder,
          });
        
        if (insertError) throw insertError;
        
        // Track analytics
        trackUpcomingCaseEvent(userId, 'add', resourceId, categoryId);
        
        return { success: true };
      } catch (err) {
        console.error('Error adding to upcoming cases:', err);
        
        // Rollback optimistic update
        if (isMounted.current) {
          setUpcomingCases(previousCases);
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
    [userId, upcomingCases, isInUpcomingCases]
  );

  /**
   * Remove a resource from upcoming cases
   */
  const removeCase = useCallback(
    async (resourceId, categoryId = null) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (!isInUpcomingCases(resourceId)) {
        return { success: true }; // Already not in upcoming cases
      }
      
      // Mark as pending
      setPendingOperations((prev) => new Set(prev).add(resourceId));
      
      // Optimistic update
      const previousCases = upcomingCases;
      const removedIndex = upcomingCases.findIndex((c) => c.resource_id === resourceId);
      
      // Remove and reorder
      const newCases = upcomingCases
        .filter((c) => c.resource_id !== resourceId)
        .map((c, index) => ({
          ...c,
          display_order: index,
        }));
      
      setUpcomingCases(newCases);
      
      try {
        // Delete from database
        const { error: deleteError } = await supabase
          .from('upcoming_cases')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
        
        if (deleteError) throw deleteError;
        
        // Update display orders for remaining items
        if (newCases.length > 0) {
          const { error: updateError } = await supabase
            .from('upcoming_cases')
            .upsert(
              newCases.map((c) => ({
                user_id: userId,
                resource_id: c.resource_id,
                display_order: c.display_order,
              })),
              { onConflict: 'user_id,resource_id' }
            );
          
          if (updateError) throw updateError;
        }
        
        // Track analytics
        trackUpcomingCaseEvent(userId, 'remove', resourceId, categoryId);
        
        return { success: true };
      } catch (err) {
        console.error('Error removing from upcoming cases:', err);
        
        // Rollback optimistic update
        if (isMounted.current) {
          setUpcomingCases(previousCases);
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
    [userId, upcomingCases, isInUpcomingCases]
  );

  /**
   * Reorder upcoming cases (for drag-and-drop)
   */
  const reorderCases = useCallback(
    async (sourceIndex, destinationIndex) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (sourceIndex === destinationIndex) {
        return { success: true };
      }
      
      // Optimistic update
      const previousCases = upcomingCases;
      const newCases = Array.from(upcomingCases);
      const [removed] = newCases.splice(sourceIndex, 1);
      newCases.splice(destinationIndex, 0, removed);
      
      // Update display orders
      const reorderedCases = newCases.map((c, index) => ({
        ...c,
        display_order: index,
      }));
      
      setUpcomingCases(reorderedCases);
      
      try {
        // Update all display orders in database
        const { error: updateError } = await supabase
          .from('upcoming_cases')
          .upsert(
            reorderedCases.map((c) => ({
              user_id: userId,
              resource_id: c.resource_id,
              display_order: c.display_order,
            })),
            { onConflict: 'user_id,resource_id' }
          );
        
        if (updateError) throw updateError;
        
        // Track analytics
        trackUpcomingCaseEvent(userId, 'reorder', removed.resource_id, null);
        
        return { success: true };
      } catch (err) {
        console.error('Error reordering upcoming cases:', err);
        
        // Rollback optimistic update
        if (isMounted.current) {
          setUpcomingCases(previousCases);
        }
        
        return { success: false, error: err.message };
      }
    },
    [userId, upcomingCases]
  );

  /**
   * Toggle case (add if not present, remove if present)
   */
  const toggleCase = useCallback(
    async (resourceId, categoryId = null) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const isPresent = isInUpcomingCases(resourceId);
      
      if (isPresent) {
        return await removeCase(resourceId, categoryId);
      } else {
        return await addCase(resourceId, categoryId);
      }
    },
    [userId, isInUpcomingCases, addCase, removeCase]
  );

  /**
   * Clear all upcoming cases
   */
  const clearAllCases = useCallback(async () => {
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    
    const previousCases = upcomingCases;
    
    // Optimistic update
    setUpcomingCases([]);
    
    try {
      const { error: deleteError } = await supabase
        .from('upcoming_cases')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;
      
      return { success: true };
    } catch (err) {
      console.error('Error clearing upcoming cases:', err);
      
      // Rollback
      if (isMounted.current) {
        setUpcomingCases(previousCases);
      }
      
      return { success: false, error: err.message };
    }
  }, [userId, upcomingCases]);

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
   * Get count of upcoming cases
   */
  const count = useMemo(() => upcomingCases.length, [upcomingCases]);

  /**
   * Check if user has any upcoming cases
   */
  const hasCases = useMemo(() => upcomingCases.length > 0, [upcomingCases]);

  /**
   * Get resource IDs as array (for easy filtering)
   */
  const resourceIds = useMemo(
    () => upcomingCases.map((c) => c.resource_id),
    [upcomingCases]
  );

  return {
    // State
    upcomingCases,
    resourceIds,
    loading,
    error,
    count,
    hasCases,
    
    // Methods
    isInUpcomingCases,
    getDisplayOrder,
    addCase,
    removeCase,
    reorderCases,
    toggleCase,
    clearAllCases,
    isPending,
    refetch: loadUpcomingCases,
  };
}

export default useUpcomingCases;
