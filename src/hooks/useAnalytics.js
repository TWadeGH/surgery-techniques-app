import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { USER_ROLES } from '../utils/constants';

/**
 * Hook for loading role-scoped analytics data.
 *
 * @param {Object} params
 * @param {Object} params.currentUser
 * @param {{ start: string, end: string }} params.dateRange
 * @param {string} params.groupBy - 'day' | 'week' | 'month'
 */
export function useAnalytics({ currentUser, dateRange, groupBy = 'day' }) {
  const [summary, setSummary] = useState(null);
  const [viewsOverTime, setViewsOverTime] = useState([]);
  const [favoritesOverTime, setFavoritesOverTime] = useState([]);
  const [topResources, setTopResources] = useState([]);
  const [bySpecialty, setBySpecialty] = useState([]);
  const [bySubspecialty, setBySubspecialty] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isSpecialtyAdmin = currentUser?.role === USER_ROLES.SPECIALTY_ADMIN;

  // Build a set of resource IDs this admin can see
  const fetchScopedResourceIds = useCallback(async () => {
    if (isSuperAdmin) return null; // null = no filter

    // Get subspecialties for scoping
    let subspecialtyIds = [];
    if (isSpecialtyAdmin && currentUser?.specialtyId) {
      const { data } = await supabase
        .from('subspecialties')
        .select('id')
        .eq('specialty_id', currentUser.specialtyId);
      subspecialtyIds = (data || []).map(s => s.id);
    } else if (currentUser?.subspecialtyId) {
      subspecialtyIds = [currentUser.subspecialtyId];
    }

    if (subspecialtyIds.length === 0) return [];

    // categories → procedures → resources chain
    const { data: cats } = await supabase
      .from('categories')
      .select('id')
      .in('subspecialty_id', subspecialtyIds);
    const catIds = (cats || []).map(c => c.id);
    if (catIds.length === 0) return [];

    const { data: resources } = await supabase
      .from('resources')
      .select('id')
      .in('category_id', catIds);
    return (resources || []).map(r => r.id);
  }, [isSuperAdmin, isSpecialtyAdmin, currentUser?.specialtyId, currentUser?.subspecialtyId]);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const scopedIds = await fetchScopedResourceIds();
      const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = dateRange?.end || new Date().toISOString();

      // Views
      let viewsQuery = supabase
        .from('resource_views')
        .select('resource_id, viewed_at, view_duration_seconds, scroll_depth_percent, completed')
        .gte('viewed_at', start)
        .lte('viewed_at', end);
      if (scopedIds) viewsQuery = viewsQuery.in('resource_id', scopedIds.length ? scopedIds : ['00000000-0000-0000-0000-000000000000']);
      const { data: views } = await viewsQuery;

      // Favorites
      let favQuery = supabase
        .from('favorite_events')
        .select('resource_id, created_at')
        .gte('created_at', start)
        .lte('created_at', end);
      if (scopedIds) favQuery = favQuery.in('resource_id', scopedIds.length ? scopedIds : ['00000000-0000-0000-0000-000000000000']);
      const { data: favs } = await favQuery;

      // Sessions
      // Sessions query available for future cohort analysis
      // const { data: sessions } = await supabase
      //   .from('user_sessions')
      //   .select('user_id, started_at, duration_seconds, user_type')
      //   .gte('started_at', start)
      //   .lte('started_at', end);

      // Summary
      const totalViews = (views || []).length;
      const uniqueUsers = new Set((views || []).map(v => v.resource_id)).size; // approx
      const totalFavorites = (favs || []).length;
      const avgDuration = totalViews > 0
        ? (views || []).reduce((s, v) => s + (v.view_duration_seconds || 0), 0) / totalViews / 60
        : 0;
      const avgScroll = totalViews > 0
        ? (views || []).reduce((s, v) => s + (v.scroll_depth_percent || 0), 0) / totalViews
        : 0;
      const completionRate = totalViews > 0
        ? (views || []).filter(v => v.completed).length / totalViews * 100
        : 0;

      setSummary({ totalViews, uniqueUsers, totalFavorites, avgDuration, avgScroll, completionRate });

      // Views over time
      const viewsByDate = {};
      (views || []).forEach(v => {
        const key = groupDate(v.viewed_at, groupBy);
        viewsByDate[key] = (viewsByDate[key] || 0) + 1;
      });
      setViewsOverTime(Object.entries(viewsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })));

      // Favorites over time
      const favsByDate = {};
      (favs || []).forEach(f => {
        const key = groupDate(f.created_at, groupBy);
        favsByDate[key] = (favsByDate[key] || 0) + 1;
      });
      setFavoritesOverTime(Object.entries(favsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })));

      // Top resources
      const resourceStats = {};
      (views || []).forEach(v => {
        if (!resourceStats[v.resource_id]) resourceStats[v.resource_id] = { id: v.resource_id, views: 0, totalDuration: 0, completions: 0, favorites: 0 };
        resourceStats[v.resource_id].views++;
        resourceStats[v.resource_id].totalDuration += v.view_duration_seconds || 0;
        if (v.completed) resourceStats[v.resource_id].completions++;
      });
      (favs || []).forEach(f => {
        if (!resourceStats[f.resource_id]) resourceStats[f.resource_id] = { id: f.resource_id, views: 0, totalDuration: 0, completions: 0, favorites: 0 };
        resourceStats[f.resource_id].favorites++;
      });

      // Fetch resource titles for top resources
      const topIds = Object.values(resourceStats).sort((a, b) => b.views - a.views).slice(0, 20).map(r => r.id);
      if (topIds.length > 0) {
        const { data: resourceData } = await supabase
          .from('resources')
          .select('id, title, category_id')
          .in('id', topIds);
        (resourceData || []).forEach(r => {
          if (resourceStats[r.id]) {
            resourceStats[r.id].title = r.title;
            resourceStats[r.id].category_id = r.category_id;
          }
        });
      }
      setTopResources(Object.values(resourceStats).sort((a, b) => b.views - a.views).slice(0, 20));

      // By specialty / subspecialty breakdown (super_admin gets specialty, others get subspecialty)
      if (isSuperAdmin) {
        const { data: specs } = await supabase.from('specialties').select('id, name');
        const { data: subsAll } = await supabase.from('subspecialties').select('id, specialty_id');
        const { data: catsAll } = await supabase.from('categories').select('id, subspecialty_id');
        const { data: resAll } = await supabase.from('resources').select('id, category_id');

        // Build resource → specialty map
        const catToSub = {};
        (catsAll || []).forEach(c => { catToSub[c.id] = c.subspecialty_id; });
        const subToSpec = {};
        (subsAll || []).forEach(s => { subToSpec[s.id] = s.specialty_id; });
        const resToSpec = {};
        (resAll || []).forEach(r => {
          const subId = catToSub[r.category_id];
          if (subId) resToSpec[r.id] = subToSpec[subId];
        });

        const specCounts = {};
        (views || []).forEach(v => {
          const specId = resToSpec[v.resource_id];
          if (specId) specCounts[specId] = (specCounts[specId] || 0) + 1;
        });
        const specMap = {};
        (specs || []).forEach(s => { specMap[s.id] = s.name; });
        setBySpecialty(Object.entries(specCounts).map(([id, count]) => ({ id, name: specMap[id] || 'Unknown', count })).sort((a, b) => b.count - a.count));
      }

      // Subspecialty breakdown for specialty/subspecialty admins
      if (isSpecialtyAdmin || isSuperAdmin) {
        const specFilter = isSpecialtyAdmin ? currentUser.specialtyId : null;
        let subQuery = supabase.from('subspecialties').select('id, name, specialty_id');
        if (specFilter) subQuery = subQuery.eq('specialty_id', specFilter);
        const { data: subs } = await subQuery;

        const { data: catsForSub } = await supabase.from('categories').select('id, subspecialty_id')
          .in('subspecialty_id', (subs || []).map(s => s.id));
        const { data: resForSub } = await supabase.from('resources').select('id, category_id')
          .in('category_id', (catsForSub || []).map(c => c.id));

        const catToSubLocal = {};
        (catsForSub || []).forEach(c => { catToSubLocal[c.id] = c.subspecialty_id; });
        const resToSub = {};
        (resForSub || []).forEach(r => {
          resToSub[r.id] = catToSubLocal[r.category_id];
        });

        const subCounts = {};
        (views || []).forEach(v => {
          const subId = resToSub[v.resource_id];
          if (subId) subCounts[subId] = (subCounts[subId] || 0) + 1;
        });
        const subMap = {};
        (subs || []).forEach(s => { subMap[s.id] = s.name; });
        setBySubspecialty(Object.entries(subCounts).map(([id, count]) => ({ id, name: subMap[id] || 'Unknown', count })).sort((a, b) => b.count - a.count));
      }

    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, dateRange, groupBy, fetchScopedResourceIds, isSuperAdmin, isSpecialtyAdmin]);

  useEffect(() => { load(); }, [load]);

  return { summary, viewsOverTime, favoritesOverTime, topResources, bySpecialty, bySubspecialty, loading, reload: load };
}

function groupDate(isoStr, groupBy) {
  const d = new Date(isoStr);
  if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (groupBy === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
