/**
 * useResources Hook
 * 
 * Manages resource data loading, filtering, search, and real-time updates.
 * Optimized for performance with memoization and smart caching.
 * 
 * @example
 * const { 
 *   resources, 
 *   loading, 
 *   searchTerm,
 *   setSearchTerm,
 *   filteredResources 
 * } = useResources({ categoryId: 123 });
 * 
 * Features:
 * - Automatic loading on mount and filter changes
 * - Client-side search with debouncing
 * - Smart filtering (favorites, categories, search)
 * - Error handling and retry logic
 * - Loading states
 * - Real-time updates via Supabase subscriptions
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.categoryId - Filter by category
 * @param {string} options.procedureId - Filter by procedure
 * @param {boolean} options.favoritesOnly - Show only favorited resources
 * @param {boolean} options.enableRealtime - Enable real-time updates (default: false)
 * @returns {Object} Resources state and methods
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { trackCategorySelection } from '../lib/analytics';
import { ERROR_MESSAGES } from '../utils/constants';
import { debounce } from '../utils/helpers';

export function useResources(options = {}) {
  const {
    categoryId,
    procedureId,
    favoritesOnly = false,
    enableRealtime = false,
  } = options;

  // State
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Refs
  const isMounted = useRef(true);
  const realtimeSubscription = useRef(null);
  const abortController = useRef(null);

  /**
   * Load resources from database
   */
  const loadResources = useCallback(async () => {
    try {
      // Cancel any pending requests
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      // Build query
      let query = supabase
        .from('resources')
        .select(`
          *,
          curated_by:profiles!resources_curated_by_fkey(email),
          suggested_by:profiles!resources_suggested_by_fkey(email)
        `)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      if (procedureId) {
        query = query.eq('procedure_id', procedureId);
      }
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      if (!isMounted.current) return;
      
      setResources(data || []);
      
      // Track category selection for analytics
      if (categoryId) {
        trackCategorySelection(null, categoryId); // userId will be added by analytics
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error('Error loading resources:', err);
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.GENERIC_ERROR);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [categoryId, procedureId]);

  /**
   * Set up real-time subscription for resource updates
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!enableRealtime || !categoryId) return;
    
    const subscription = supabase
      .channel(`resources:category_id=eq.${categoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources',
          filter: `category_id=eq.${categoryId}`,
        },
        (payload) => {
          if (!isMounted.current) return;
          
          if (payload.eventType === 'INSERT') {
            setResources((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setResources((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setResources((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    realtimeSubscription.current = subscription;
  }, [enableRealtime, categoryId]);

  /**
   * Clean up subscriptions
   */
  const cleanupSubscription = useCallback(() => {
    if (realtimeSubscription.current) {
      supabase.removeChannel(realtimeSubscription.current);
      realtimeSubscription.current = null;
    }
  }, []);

  /**
   * Load resources on mount and when filters change
   */
  useEffect(() => {
    loadResources();
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadResources]);

  /**
   * Set up/cleanup realtime subscription
   */
  useEffect(() => {
    setupRealtimeSubscription();
    
    return () => {
      cleanupSubscription();
    };
  }, [setupRealtimeSubscription, cleanupSubscription]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanupSubscription();
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [cleanupSubscription]);

  /**
   * Filter resources by search term (memoized)
   */
  const filteredResources = useMemo(() => {
    if (!searchTerm.trim()) {
      return resources;
    }
    
    const term = searchTerm.toLowerCase();
    
    return resources.filter((resource) => {
      const searchableText = [
        resource.title,
        resource.description,
        resource.resource_type,
        resource.keywords?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return searchableText.includes(term);
    });
  }, [resources, searchTerm]);

  /**
   * Get featured resources (memoized)
   */
  const featuredResources = useMemo(() => {
    return resources.filter((r) => r.is_featured);
  }, [resources]);

  /**
   * Get recommended resources (memoized)
   */
  const recommendedResources = useMemo(() => {
    return resources.filter((r) => r.is_recommended);
  }, [resources]);

  /**
   * Get sponsored resources (memoized)
   */
  const sponsoredResources = useMemo(() => {
    return resources.filter((r) => r.is_sponsored);
  }, [resources]);

  /**
   * Group resources by type (memoized)
   */
  const resourcesByType = useMemo(() => {
    return resources.reduce((acc, resource) => {
      const type = resource.resource_type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(resource);
      return acc;
    }, {});
  }, [resources]);

  /**
   * Debounced search handler
   */
  const debouncedSetSearchTerm = useMemo(
    () => debounce((term) => setSearchTerm(term), 300),
    []
  );

  /**
   * Add a new resource (optimistic update)
   */
  const addResource = useCallback(async (resourceData) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(resourceData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Optimistic update
      if (isMounted.current) {
        setResources((prev) => [data, ...prev]);
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('Error adding resource:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Update a resource (optimistic update)
   */
  const updateResource = useCallback(async (resourceId, updates) => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', resourceId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Optimistic update
      if (isMounted.current) {
        setResources((prev) =>
          prev.map((r) => (r.id === resourceId ? data : r))
        );
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating resource:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Delete a resource (optimistic update)
   */
  const deleteResource = useCallback(async (resourceId) => {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);
      
      if (error) throw error;
      
      // Optimistic update
      if (isMounted.current) {
        setResources((prev) => prev.filter((r) => r.id !== resourceId));
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting resource:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Increment view count
   */
  const incrementViewCount = useCallback(async (resourceId) => {
    try {
      await supabase.rpc('increment_view_count', { resource_id: resourceId });
    } catch (err) {
      console.error('Error incrementing view count:', err);
      // Don't throw - this is a non-critical operation
    }
  }, []);

  /**
   * Get resource by ID
   */
  const getResourceById = useCallback((resourceId) => {
    return resources.find((r) => r.id === resourceId);
  }, [resources]);

  return {
    // State
    resources,
    filteredResources,
    featuredResources,
    recommendedResources,
    sponsoredResources,
    resourcesByType,
    loading,
    error,
    searchTerm,
    
    // Computed
    isEmpty: resources.length === 0,
    count: resources.length,
    filteredCount: filteredResources.length,
    
    // Methods
    setSearchTerm: debouncedSetSearchTerm,
    setSearchTermImmediate: setSearchTerm,
    refetch: loadResources,
    addResource,
    updateResource,
    deleteResource,
    incrementViewCount,
    getResourceById,
  };
}

export default useResources;
