import { supabase } from '../lib/supabase';

/**
 * Log an admin action to the admin_actions audit table.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function logAdminAction(adminId, actionType, targetType, targetId, metadata = {}) {
  try {
    if (!adminId || !actionType) return;
    await supabase.from('admin_actions').insert([{
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType || null,
      target_id: targetId || null,
      metadata,
    }]);
  } catch (err) {
    console.warn('Failed to log admin action:', err.message);
  }
}
