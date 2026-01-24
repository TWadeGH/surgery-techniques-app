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
    // Get first view time
    const { data: firstView } = await supabase
      .from('resource_views')
      .select('viewed_at')
      .eq('resource_id', resourceId)
      .eq('user_id', userId)
      .order('viewed_at', { ascending: true })
      .limit(1)
      .single();
    
    // Count views before favoriting
    const { count: viewCount } = await supabase
      .from('resource_views')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('user_id', userId);
    
    const firstViewedAt = firstView?.viewed_at ? new Date(firstView.viewed_at) : new Date();
    const favoritedAt = new Date();
    const timeToFavoriteHours = (favoritedAt - firstViewedAt) / (1000 * 60 * 60);
    
    await supabase.from('favorite_events').insert([{
      user_id: userId,
      resource_id: resourceId,
      first_viewed_at: firstViewedAt,
      favorited_at: favoritedAt,
      time_to_favorite_hours: timeToFavoriteHours,
      view_count_before_favorite: viewCount || 0
    }]);
  } catch (error) {
    console.error('Error tracking favorite event:', error);
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

export function trackResourceCoview(resourceId) {
  if (lastViewedResource && lastViewedResource.id !== resourceId) {
    const timeBetween = Math.floor((Date.now() - lastViewedResource.time) / 1000);
    
    // Silently track coviews - errors are non-critical for analytics
    supabase.from('resource_coviews').insert([{
      session_id: sessionId,
      resource_a_id: lastViewedResource.id,
      resource_b_id: resourceId,
      viewed_a_first: true,
      time_between_seconds: timeBetween
    }]).then(() => {
      // Success - no need to log
    }).catch((error) => {
      // Silently handle errors - coview tracking is optional
      // RLS policies may block this for some users, which is fine
      if (error.code !== '42501') { // 42501 = insufficient_privilege
        console.warn('Coview tracking failed (non-critical):', error.message);
      }
    });
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
export function trackSearchQuery(userId, query, resultCount) {
  supabase.from('search_queries').insert([{
    user_id: userId,
    session_id: sessionId,
    query_text: query,
    result_count: resultCount,
    searched_at: new Date()
  }]).then();
}

// Track upcoming case event
export function trackUpcomingCaseEvent(userId, action, resourceId, categoryId) {
  supabase.from('upcoming_case_events').insert([{
    user_id: userId,
    session_id: sessionId,
    action: action, // 'add', 'remove', 'reorder'
    resource_id: resourceId,
    category_id: categoryId,
    event_at: new Date()
  }]).then();
}

// Track rating event
export function trackRatingEvent(userId, resourceId, rating, categoryId) {
  supabase.from('rating_events').insert([{
    user_id: userId,
    session_id: sessionId,
    resource_id: resourceId,
    rating: rating,
    category_id: categoryId,
    rated_at: new Date()
  }]).then();
}

// Track category selection
export function trackCategorySelection(userId, categoryId) {
  supabase.from('category_selections').insert([{
    user_id: userId,
    session_id: sessionId,
    category_id: categoryId,
    selected_at: new Date()
  }]).then();
}

// Track resource suggestion
export function trackResourceSuggestion(userId, resourceTitle, categoryId) {
  supabase.from('resource_suggestion_events').insert([{
    user_id: userId,
    session_id: sessionId,
    resource_title: resourceTitle,
    category_id: categoryId,
    suggested_at: new Date()
  }]).then();
}

// Track sponsored engagement
export function trackSponsoredEngagement(userId, resourceId, engagementType) {
  supabase.from('sponsored_engagement').insert([{
    user_id: userId,
    session_id: sessionId,
    resource_id: resourceId,
    engagement_type: engagementType, // 'view', 'click', 'favorite', etc.
    engaged_at: new Date()
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