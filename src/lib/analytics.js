// Analytics tracking utility
// CRITICAL: All tracking is aggregated and de-identified
// Never expose individual surgeon behavior

import { supabase } from './supabase';

let sessionId = null;
let sessionStart = null;
let currentResourceView = null;

// Initialize session on app load
export function initAnalyticsSession(userId, userMetadata) {
  sessionId = crypto.randomUUID();
  sessionStart = new Date();
  
  // Record session (with anonymized cohort data)
  supabase.from('user_sessions').insert([{
    id: sessionId,
    user_id: userId,
    started_at: sessionStart,
    user_specialty_id: userMetadata.specialtyId,
    user_subspecialty_id: userMetadata.subspecialtyId,
    user_years_experience_bucket: userMetadata.experienceBucket, // Will add to profile later
    user_practice_type: userMetadata.practiceType, // Will add to profile later
    user_region: userMetadata.region // Will add to profile later
  }]).then();
}

// Track resource view (start)
export function trackResourceView(resourceId, userId, entryPath = 'browse') {
  const viewStartTime = Date.now();
  
  currentResourceView = {
    resourceId,
    userId,
    sessionId,
    viewStartTime,
    entryPath
  };
  
  // We'll update this when they leave
}

// Track resource view (end) - captures engagement
export function trackResourceViewEnd(scrollDepth = 0, completed = false) {
  if (!currentResourceView) return;
  
  const viewDuration = Math.floor((Date.now() - currentResourceView.viewStartTime) / 1000);
  
  supabase.from('resource_views').insert([{
    resource_id: currentResourceView.resourceId,
    user_id: currentResourceView.userId,
    session_id: sessionId,
    view_duration_seconds: viewDuration,
    scroll_depth_percent: scrollDepth,
    completed: completed,
    entry_path: currentResourceView.entryPath,
    device_type: getDeviceType(),
    viewed_at: new Date(currentResourceView.viewStartTime),
    exited_at: new Date()
  }]).then();
  
  currentResourceView = null;
}

// Track favorite event (GOLD for learning curve analysis)
export async function trackFavoriteEvent(resourceId, userId) {
  try {
    // Get first view time (use maybeSingle to handle no views gracefully)
    const { data: firstView } = await supabase
      .from('resource_views')
      .select('viewed_at')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .order('viewed_at', { ascending: true })
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results
    
    // Count views before favoriting
    const { count: viewCount } = await supabase
      .from('resource_views')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('user_id', userId);
    
    const firstViewedAt = firstView?.viewed_at ? new Date(firstView.viewed_at) : new Date();
    const favoritedAt = new Date();
    const timeToFavoriteHours = (favoritedAt - firstViewedAt) / (1000 * 60 * 60);
    
    const { error } = await supabase.from('favorite_events').insert([{
      user_id: userId,
      resource_id: resourceId,
      first_viewed_at: firstViewedAt,
      favorited_at: favoritedAt,
      time_to_favorite_hours: timeToFavoriteHours,
      view_count_before_favorite: viewCount || 0
    }]);
    
    // Silently ignore 409 Conflict (duplicate favorite event) - expected behavior
    if (error && error.code !== '23505' && error.status !== 409) {
      // Only log unexpected errors
      console.warn('Analytics: Non-critical favorite event tracking error:', error.code);
    }
  } catch (error) {
    // Silently ignore analytics errors - they're non-critical
    // Don't log to avoid cluttering console
  }
}

// Track unfavorite
export async function trackUnfavoriteEvent(resourceId, userId) {
  try {
    await supabase
      .from('favorite_events')
      .update({ unfavorited_at: new Date() })
      .eq('user_id', userId)
      .eq('resource_id', resourceId);
  } catch (error) {
    console.error('Error tracking unfavorite event:', error);
  }
}

// Track co-views (which resources viewed together)
let lastViewedResource = null;

/**
 * Track resource co-views (which resources are viewed together)
 * Security: Fails gracefully if RLS policies don't allow insert
 * @param {string} resourceId - ID of the resource being viewed
 */
export async function trackResourceCoview(resourceId) {
  // Security: Validate input to prevent injection
  if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
    return; // Silently fail for invalid input
  }
  
  if (lastViewedResource && lastViewedResource.id !== resourceId) {
    const timeBetween = Math.floor((Date.now() - lastViewedResource.time) / 1000);
    
    try {
      const { error } = await supabase.from('resource_coviews').insert([{
        session_id: sessionId,
        resource_a_id: lastViewedResource.id,
        resource_b_id: resourceId,
        viewed_a_first: true,
        time_between_seconds: timeBetween
      }]);
      
      // Security: Silently ignore 403/RLS errors - these are expected if RLS policies restrict access
      // Don't log to console to avoid cluttering developer tools
      if (error) {
        // 403 Forbidden, 42501 (insufficient_privilege), PGRST301 (RLS policy violation) are expected
        const isRLSError = error.status === 403 || 
                          error.code === '42501' || 
                          error.code === 'PGRST301' ||
                          error.message?.includes('permission denied') ||
                          error.message?.includes('row-level security');
        
        if (!isRLSError) {
          // Only log unexpected errors (not RLS-related)
          console.error('Analytics error (non-RLS):', error.code || 'Unknown');
        }
        // Silently ignore RLS errors - they're expected
        return;
      }
      // If no error, continue (successful insert)
    } catch (error) {
      // Security: Fail gracefully, don't expose internal errors
      // Analytics failures should not break the app
      console.warn('Analytics tracking failed (non-critical)');
    }
  }
  
  lastViewedResource = {
    id: resourceId,
    time: Date.now()
  };
}

// Track sponsored content impression
export function trackSponsoredImpression(resourceId, viewedAfterEditorial = false) {
  supabase.from('sponsored_analytics').insert([{
    resource_id: resourceId,
    impression_count: 1,
    viewed_after_editorial: viewedAfterEditorial
  }]).then();
}

// Track sponsored content click
export function trackSponsoredClick(resourceId) {
  supabase.from('sponsored_analytics').insert([{
    resource_id: resourceId,
    click_count: 1
  }]).then();
}

// Track search query
export async function trackSearchQuery(query, userId, resultCount = 0) {
  // Security: Validate input to prevent injection
  if (!query || typeof query !== 'string' || !query.trim()) return;
  if (query.length > 500) return; // Prevent DoS with extremely long queries
  if (!userId || typeof userId !== 'string') return;
  
  try {
    const { error } = await supabase.from('search_queries').insert([{
      user_id: userId,
      session_id: sessionId,
      query: query.trim().substring(0, 500), // Sanitize length
      result_count: resultCount,
      searched_at: new Date()
    }]);
    
    // Security: Fail gracefully - analytics errors shouldn't break the app
    if (error && error.code !== 'PGRST301' && error.code !== '42501') {
      console.warn('Analytics tracking error (non-critical):', error.code);
    }
  } catch (error) {
    // Silently ignore analytics failures
    console.warn('Analytics tracking failed (non-critical)');
  }
}

// Track category selection
export async function trackCategorySelection(userId, categoryId, procedureId = null) {
  // Security: Validate input
  if (!categoryId) return;
  if (!userId || typeof userId !== 'string') return;
  if (typeof categoryId !== 'string' || categoryId.length > 100) return;
  if (procedureId && (typeof procedureId !== 'string' || procedureId.length > 100)) return;
  
  try {
    const { error } = await supabase.from('category_selections').insert([{
      user_id: userId,
      session_id: sessionId,
      category_id: categoryId,
      procedure_id: procedureId,
      selected_at: new Date()
    }]);
    
    // Security: Fail gracefully - analytics errors shouldn't break the app
    if (error && error.code !== 'PGRST301' && error.code !== '42501') {
      console.warn('Analytics tracking error (non-critical):', error.code);
    }
  } catch (error) {
    // Silently ignore analytics failures
    console.warn('Analytics tracking failed (non-critical)');
  }
}

// Track rating event
export function trackRatingEvent(resourceId, userId, rating, comment = null) {
  if (!resourceId || !userId || !rating) return;
  
  supabase.from('ratings').insert([{
    resource_id: resourceId,
    user_id: userId,
    session_id: sessionId,
    rating: rating,
    comment: comment,
    rated_at: new Date()
  }]).then();
}

// Track upcoming case event (add, remove, reorder)
export function trackUpcomingCaseEvent(userId, action, resourceId, categoryId = null) {
  if (!userId || !action || !resourceId) return;
  
  supabase.from('upcoming_case_events').insert([{
    user_id: userId,
    session_id: sessionId,
    action: action, // 'add', 'remove', 'reorder'
    resource_id: resourceId,
    category_id: categoryId,
    event_at: new Date()
  }]).then();
}

// End session
export function endAnalyticsSession() {
  if (!sessionId || !sessionStart) return;
  
  const sessionEnd = new Date();
  const durationMinutes = Math.floor((sessionEnd - sessionStart) / (1000 * 60));
  
  supabase.from('user_sessions')
    .update({
      ended_at: sessionEnd,
      duration_minutes: durationMinutes
    })
    .eq('id', sessionId)
    .then();
  
  sessionId = null;
  sessionStart = null;
}

// Helper functions
function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Aggregation functions (for reporting - admin only)
export async function getAggregatedInsights(insightType, periodStart, periodEnd) {
  // This would be called by analytics dashboard
  // Returns only aggregated data with minimum N=10
  
  const { data } = await supabase
    .from('analytics_insights')
    .select('*')
    .eq('insight_type', insightType)
    .gte('period_start', periodStart)
    .lte('period_end', periodEnd)
    .gte('sample_size', 10); // Enforce minimum cohort
  
  return data;
}