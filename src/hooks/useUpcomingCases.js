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
      setUpcomingCases([]);
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
      
      console.log('🔵 Loading upcoming cases for user:', userId.substring(0, 8) + '...');
      
      const { data, error: queryError } = await supabase
        .from('upcoming_cases')
        .select('resource_id, display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      
      // Security: Handle RLS errors gracefully (403 Forbidden is expected if RLS blocks access)
      if (queryError) {
        const isRLSError = queryError.status === 403 ||
                          queryError.code === '42501' ||
                          queryError.code === 'PGRST301' ||
                          queryError.message?.includes('permission denied') ||
                          queryError.message?.includes('row-level security');
        
        if (isRLSError) {
          console.warn('⚠️ Upcoming cases RLS error (expected if policies restrict access):', queryError.code || 'Unknown');
          // Return empty array instead of throwing - don't break the app
          setUpcomingCases([]);
          setLoading(false);
          return;
        }
        
        throw queryError;
      }
      
      console.log('✅ Upcoming cases loaded successfully, received', data?.length || 0, 'cases');
      
      // Always set state, even if component unmounts (it will remount)
      setUpcomingCases(data || []);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error('🔴 Error loading upcoming cases:', err.code || 'Unknown', err.message?.substring(0, 100));
      
      // Security: Sanitize error message, don't expose internal details
      const sanitizedError = err.message?.substring(0, 100) || ERROR_MESSAGES.GENERIC_ERROR;
      setError(sanitizedError);
      setUpcomingCases([]); // Set empty array on error
    } finally {
      setLoading(false);
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
        console.log('🔵 Adding upcoming case:', resourceId.substring(0, 8) + '...');
        
        const { error: insertError } = await supabase
          .from('upcoming_cases')
          .insert({
            user_id: userId,
            resource_id: resourceId,
            display_order: newDisplayOrder,
          });
        
        // Security: Handle RLS errors gracefully
        if (insertError) {
          const isRLSError = insertError.status === 403 ||
                            insertError.code === '42501' ||
                            insertError.code === 'PGRST301' ||
                            insertError.message?.includes('permission denied') ||
                            insertError.message?.includes('row-level security');
          
          if (isRLSError) {
            console.warn('⚠️ Upcoming cases insert RLS error (expected if policies restrict access)');
            // Rollback optimistic update
            setUpcomingCases(previousCases);
            return { success: false, error: 'Permission denied' };
          }
          
          throw insertError;
        }
        
        console.log('✅ Upcoming case added successfully');
        
        // Reload to ensure UI syncs with DB
        await loadUpcomingCases();
        
        // Track analytics (silently ignore errors)
        try {
          const trackResult = trackUpcomingCaseEvent(userId, 'add', resourceId, categoryId);
          if (trackResult && typeof trackResult.catch === 'function') {
            trackResult.catch(() => {});
          }
        } catch (err) {
          // Silently ignore analytics errors
        }
        
        return { success: true };
      } catch (err) {
        console.error('🔴 Error adding to upcoming cases:', err.code || 'Unknown', err.message?.substring(0, 100));
        
        // Rollback optimistic update
        setUpcomingCases(previousCases);
        
        // Security: Sanitize error message
        const sanitizedError = err.message?.substring(0, 100) || 'Failed to add to upcoming cases';
        return { success: false, error: sanitizedError };
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
        console.log('🔵 Removing upcoming case:', resourceId.substring(0, 8) + '...');
        
        // Delete from database
        const { error: deleteError } = await supabase
          .from('upcoming_cases')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
        
        // Security: Handle RLS errors gracefully
        if (deleteError) {
          const isRLSError = deleteError.status === 403 ||
                            deleteError.code === '42501' ||
                            deleteError.code === 'PGRST301' ||
                            deleteError.message?.includes('permission denied') ||
                            deleteError.message?.includes('row-level security');
          
          if (isRLSError) {
            console.warn('⚠️ Upcoming cases delete RLS error (expected if policies restrict access)');
            // Rollback optimistic update
            setUpcomingCases(previousCases);
            return { success: false, error: 'Permission denied' };
          }
          
          throw deleteError;
        }
        
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
          
          // Security: Handle RLS errors gracefully
          if (updateError) {
            const isRLSError = updateError.status === 403 ||
                              updateError.code === '42501' ||
                              updateError.code === 'PGRST301' ||
                              updateError.message?.includes('permission denied') ||
                              updateError.message?.includes('row-level security');
            
            if (isRLSError) {
              console.warn('⚠️ Upcoming cases update RLS error (expected if policies restrict access)');
              // Rollback optimistic update
              setUpcomingCases(previousCases);
              return { success: false, error: 'Permission denied' };
            }
            
            throw updateError;
          }
        }
        
        console.log('✅ Upcoming case removed successfully');
        
        // Reload to ensure UI syncs with DB
        await loadUpcomingCases();
        
        // Track analytics (silently ignore errors)
        try {
          const trackResult = trackUpcomingCaseEvent(userId, 'remove', resourceId, categoryId);
          if (trackResult && typeof trackResult.catch === 'function') {
            trackResult.catch(() => {});
          }
        } catch (err) {
          // Silently ignore analytics errors
        }
        
        return { success: true };
      } catch (err) {
        console.error('🔴 Error removing from upcoming cases:', err.code || 'Unknown', err.message?.substring(0, 100));
        
        // Rollback optimistic update
        setUpcomingCases(previousCases);
        
        // Security: Sanitize error message
        const sanitizedError = err.message?.substring(0, 100) || 'Failed to remove from upcoming cases';
        return { success: false, error: sanitizedError };
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
      
      // Sort cases by display_order first to ensure correct indices
      const sortedCases = [...upcomingCases].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Validate indices
      if (sourceIndex < 0 || sourceIndex >= sortedCases.length || 
          destinationIndex < 0 || destinationIndex >= sortedCases.length) {
        console.error('Invalid indices for reorder:', sourceIndex, destinationIndex, 'array length:', sortedCases.length);
        return { success: false, error: 'Invalid indices' };
      }
      
      // Optimistic update
      const previousCases = upcomingCases;
      const newCases = Array.from(sortedCases);
      const [removed] = newCases.splice(sourceIndex, 1);
      newCases.splice(destinationIndex, 0, removed);
      
      // Update display orders
      const reorderedCases = newCases.map((c, index) => ({
        ...c,
        display_order: index,
      }));
      
      console.log('🔵 Reordering upcoming cases:', sourceIndex, '->', destinationIndex);
      console.log('🔵 Before reorder:', sortedCases.map(c => ({ id: c.resource_id?.substring(0, 8), order: c.display_order })));
      console.log('🔵 Reordered cases:', reorderedCases.map(c => ({ id: c.resource_id?.substring(0, 8), order: c.display_order })));
      
      // Update state immediately for optimistic UI update
      setUpcomingCases(reorderedCases);
      console.log('✅ State updated optimistically');
      
      try {
        // Update all display orders in database
        const upsertData = reorderedCases.map((c) => ({
          user_id: userId,
          resource_id: c.resource_id,
          display_order: c.display_order,
        }));
        
        console.log('🔵 Upserting to DB:', upsertData);
        
        const { error: updateError } = await supabase
          .from('upcoming_cases')
          .upsert(
            upsertData,
            { onConflict: 'user_id,resource_id' }
          );
        
        // Security: Handle RLS errors gracefully
        if (updateError) {
          console.error('🔴 Update error:', updateError);
          const isRLSError = updateError.status === 403 ||
                            updateError.code === '42501' ||
                            updateError.code === 'PGRST301' ||
                            updateError.message?.includes('permission denied') ||
                            updateError.message?.includes('row-level security');
          
          if (isRLSError) {
            console.warn('⚠️ Upcoming cases reorder RLS error (expected if policies restrict access)');
            // Rollback optimistic update
            setUpcomingCases(previousCases);
            return { success: false, error: 'Permission denied' };
          }
          
          throw updateError;
        }
        
        console.log('✅ Upcoming cases reordered successfully in DB');
        
        // Don't reload immediately - the optimistic update should be enough
        // Only reload if there's a mismatch (we'll do this in a separate effect if needed)
        // await loadUpcomingCases();
        
        // Track analytics (silently ignore errors)
        try {
          const trackResult = trackUpcomingCaseEvent(userId, 'reorder', removed.resource_id, null);
          if (trackResult && typeof trackResult.catch === 'function') {
            trackResult.catch(() => {});
          }
        } catch (err) {
          // Silently ignore analytics errors
        }
        
        return { success: true };
      } catch (err) {
        console.error('🔴 Error reordering upcoming cases:', err.code || 'Unknown', err.message?.substring(0, 100));
        
        // Rollback optimistic update
        setUpcomingCases(previousCases);
        
        // Security: Sanitize error message
        const sanitizedError = err.message?.substring(0, 100) || 'Failed to reorder upcoming cases';
        return { success: false, error: sanitizedError };
      }
    },
    [userId, upcomingCases, loadUpcomingCases]
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
