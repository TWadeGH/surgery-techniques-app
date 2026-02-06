import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { USER_ROLES } from '../utils/constants';

/**
 * Hook for loading admin activity data.
 * Super admin sees all admins; specialty admin sees subspecialty admins in their specialty.
 */
export function useAdminActivity({ currentUser }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const isSuperAdmin = currentUser.role === USER_ROLES.SUPER_ADMIN;

      // Get admin profiles
      let profileQuery = supabase
        .from('profiles')
        .select('id, email, role, primary_specialty_id, primary_subspecialty_id, last_sign_in_at')
        .in('role', [USER_ROLES.SUPER_ADMIN, USER_ROLES.SPECIALTY_ADMIN, USER_ROLES.SUBSPECIALTY_ADMIN, USER_ROLES.ADMIN]);

      if (!isSuperAdmin && currentUser.specialtyId) {
        profileQuery = profileQuery
          .eq('primary_specialty_id', currentUser.specialtyId)
          .eq('role', USER_ROLES.SUBSPECIALTY_ADMIN);
      }

      const { data: profiles } = await profileQuery;
      if (!profiles || profiles.length === 0) { setAdmins([]); setLoading(false); return; }

      const adminIds = profiles.map(p => p.id);

      // Get action counts from admin_actions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: actions } = await supabase
        .from('admin_actions')
        .select('admin_id, action_type')
        .in('admin_id', adminIds)
        .gte('created_at', thirtyDaysAgo);

      // Aggregate actions per admin
      const actionCounts = {};
      (actions || []).forEach(a => {
        if (!actionCounts[a.admin_id]) actionCounts[a.admin_id] = { created: 0, edited: 0, reviewed: 0 };
        if (a.action_type === 'resource_created') actionCounts[a.admin_id].created++;
        else if (a.action_type === 'resource_edited') actionCounts[a.admin_id].edited++;
        else if (['suggestion_approved', 'suggestion_rejected', 'report_dismissed', 'report_reviewed'].includes(a.action_type)) {
          actionCounts[a.admin_id].reviewed++;
        }
      });

      // Get specialty/subspecialty names
      const specIds = [...new Set(profiles.map(p => p.primary_specialty_id).filter(Boolean))];
      const subIds = [...new Set(profiles.map(p => p.primary_subspecialty_id).filter(Boolean))];

      const [{ data: specs }, { data: subs }] = await Promise.all([
        specIds.length ? supabase.from('specialties').select('id, name').in('id', specIds) : { data: [] },
        subIds.length ? supabase.from('subspecialties').select('id, name').in('id', subIds) : { data: [] },
      ]);

      const specMap = {};
      (specs || []).forEach(s => { specMap[s.id] = s.name; });
      const subMap = {};
      (subs || []).forEach(s => { subMap[s.id] = s.name; });

      const result = profiles.map(p => ({
        id: p.id,
        email: p.email,
        role: p.role,
        specialty: specMap[p.primary_specialty_id] || '-',
        subspecialty: subMap[p.primary_subspecialty_id] || '-',
        lastLogin: p.last_sign_in_at,
        resourcesAdded: actionCounts[p.id]?.created || 0,
        resourcesEdited: actionCounts[p.id]?.edited || 0,
        suggestionsReviewed: actionCounts[p.id]?.reviewed || 0,
      }));

      setAdmins(result);
    } catch (err) {
      console.error('Error loading admin activity:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  return { admins, loading, reload: load };
}
