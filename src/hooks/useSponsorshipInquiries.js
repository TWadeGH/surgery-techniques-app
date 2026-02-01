import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { USER_ROLES } from '../utils/constants';

export function useSponsorshipInquiries({ currentUser }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let query = supabase
        .from('sponsorship_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      // RLS handles scoping, but we apply client-side filter too for safety
      if (currentUser.role === USER_ROLES.SPECIALTY_ADMIN && currentUser.specialtyId) {
        query = query.eq('specialty_id', currentUser.specialtyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInquiries(data || []);
    } catch (err) {
      console.error('Error loading sponsorship inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (id, status, adminNotes) => {
    try {
      const updateData = { status, updated_at: new Date().toISOString() };
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

      const { error } = await supabase
        .from('sponsorship_inquiries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await load();
      return { success: true };
    } catch (err) {
      console.error('Error updating inquiry:', err);
      return { success: false, error: err.message };
    }
  }, [load]);

  const pendingCount = inquiries.filter(i => i.status === 'new').length;

  return { inquiries, loading, updateStatus, pendingCount, reload: load };
}
