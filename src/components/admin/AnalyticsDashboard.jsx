/**
 * AnalyticsDashboard Component
 * Admin analytics dashboard showing resource engagement metrics
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Heart, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * AnalyticsDashboard Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of resource objects
 */
export default function AnalyticsDashboard({ resources }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      // Load recent view counts
      const { data: views } = await supabase
        .from('resource_views')
        .select('resource_id, view_duration_seconds, completed')
        .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      // Load favorite events
      const { data: favoriteEvents } = await supabase
        .from('favorite_events')
        .select('resource_id, time_to_favorite_hours, view_count_before_favorite');

      // Aggregate by resource
      const resourceStats = {};
      
      views?.forEach(view => {
        if (!resourceStats[view.resource_id]) {
          resourceStats[view.resource_id] = {
            viewCount: 0,
            totalDuration: 0,
            completions: 0
          };
        }
        resourceStats[view.resource_id].viewCount++;
        resourceStats[view.resource_id].totalDuration += view.view_duration_seconds || 0;
        if (view.completed) resourceStats[view.resource_id].completions++;
      });

      favoriteEvents?.forEach(event => {
        if (!resourceStats[event.resource_id]) {
          resourceStats[event.resource_id] = { viewCount: 0, totalDuration: 0, completions: 0 };
        }
        resourceStats[event.resource_id].favoriteCount = (resourceStats[event.resource_id].favoriteCount || 0) + 1;
        resourceStats[event.resource_id].avgTimeToFavorite = event.time_to_favorite_hours;
      });

      setAnalyticsData(resourceStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  // Get top resources
  const topResources = resources
    .map(r => ({
      ...r,
      stats: analyticsData?.[r.id] || { viewCount: 0, totalDuration: 0, completions: 0, favoriteCount: 0 }
    }))
    .sort((a, b) => b.stats.viewCount - a.stats.viewCount)
    .slice(0, 10);

  const totalViews = Object.values(analyticsData || {}).reduce((sum, stats) => sum + stats.viewCount, 0);
  const totalFavorites = Object.values(analyticsData || {}).reduce((sum, stats) => sum + (stats.favoriteCount || 0), 0);
  const avgEngagement = totalViews > 0 
    ? Object.values(analyticsData || {}).reduce((sum, stats) => sum + stats.totalDuration, 0) / totalViews / 60
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Views (30d)</h4>
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalViews}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Across all resources</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Favorites</h4>
            <Heart size={20} className="text-red-500" fill="currentColor" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalFavorites}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Learning signals</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Avg Time Spent</h4>
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgEngagement.toFixed(1)}m</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Per resource view</p>
        </div>
      </div>

      {/* Top Resources */}
      <div className="glass rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Resources (Last 30 Days)</h3>
        <div className="space-y-3">
          {topResources.map((resource, index) => (
            <div key={resource.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{resource.title}</h4>
                  <p className="text-sm text-gray-600">
                    {resource.stats.viewCount} views • 
                    {resource.stats.favoriteCount || 0} favorites • 
                    {(resource.stats.totalDuration / 60 / (resource.stats.viewCount || 1)).toFixed(1)}m avg
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note about privacy */}
      <div className="glass rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
        <h4 className="font-semibold text-gray-900 mb-2">🔒 Privacy & Trust</h4>
        <p className="text-sm text-gray-600">
          All analytics are aggregated and de-identified. Individual surgeon behavior is never tracked or shared. 
          Industry reports require minimum cohort size of N=10 surgeons.
        </p>
      </div>
    </div>
  );
}
