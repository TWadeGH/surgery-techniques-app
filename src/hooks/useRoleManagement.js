import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { USER_ROLES } from '../utils/constants';
import { logAdminAction } from '../utils/adminAudit';

export function useRoleManagement({ currentUser }) {
  const [admins, setAdmins] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, role, primary_specialty_id, primary_subspecialty_id')
        .in('role', [USER_ROLES.SUPER_ADMIN, USER_ROLES.SPECIALTY_ADMIN, USER_ROLES.SUBSPECIALTY_ADMIN, USER_ROLES.ADMIN]);

      // Fetch specialty/subspecialty names
      const specIds = [...new Set((profiles || []).map(p => p.primary_specialty_id).filter(Boolean))];
      const subIds = [...new Set((profiles || []).map(p => p.primary_subspecialty_id).filter(Boolean))];

      const [{ data: specs }, { data: subs }] = await Promise.all([
        specIds.length ? supabase.from('specialties').select('id, name').in('id', specIds) : { data: [] },
        subIds.length ? supabase.from('subspecialties').select('id, name').in('id', subIds) : { data: [] },
      ]);

      const specMap = {};
      (specs || []).forEach(s => { specMap[s.id] = s.name; });
      const subMap = {};
      (subs || []).forEach(s => { subMap[s.id] = s.name; });

      setAdmins((profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        role: p.role,
        specialtyId: p.primary_specialty_id,
        subspecialtyId: p.primary_subspecialty_id,
        specialty: specMap[p.primary_specialty_id] || '-',
        subspecialty: subMap[p.primary_subspecialty_id] || '-',
      })));
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const searchUsers = useCallback((email) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!email || email.length < 3) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, role, primary_specialty_id, primary_subspecialty_id')
          .ilike('email', `%${email}%`)
          .limit(10);
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const assignRole = useCallback(async (userId, role, specialtyId, subspecialtyId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          primary_specialty_id: specialtyId || null,
          primary_subspecialty_id: subspecialtyId || null,
        })
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction(currentUser.id, 'role_assigned', 'profile', userId, { role, specialtyId, subspecialtyId });
      await loadAdmins();
      return { success: true };
    } catch (err) {
      console.error('Error assigning role:', err);
      return { success: false, error: err.message };
    }
  }, [currentUser?.id, loadAdmins]);

  const revokeRole = useCallback(async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: USER_ROLES.USER,
          primary_specialty_id: null,
          primary_subspecialty_id: null,
        })
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction(currentUser.id, 'role_revoked', 'profile', userId, {});
      await loadAdmins();
      return { success: true };
    } catch (err) {
      console.error('Error revoking role:', err);
      return { success: false, error: err.message };
    }
  }, [currentUser?.id, loadAdmins]);

  return { admins, loading, searchUsers, searchResults, searching, assignRole, revokeRole };
}
