/**
 * useAdminMessaging Hook
 * Manages 1:1 messaging between admin users with real-time delivery via Supabase.
 *
 * Visibility rules:
 * - super_admin: can message any admin
 * - specialty_admin: can message super_admin + subspecialty admins in their specialty
 * - subspecialty_admin: can message super_admin + specialty admin + peer subspecialty admins in their specialty
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { USER_ROLES } from '../utils/constants';

export function useAdminMessaging(currentUser) {
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const channelRef = useRef(null);

  const isAdminUser = currentUser && [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.SPECIALTY_ADMIN,
    USER_ROLES.SUBSPECIALTY_ADMIN,
  ].includes(currentUser.role);

  // Load reachable contacts based on role visibility rules
  const loadContacts = useCallback(async () => {
    if (!isAdminUser || !currentUser?.id) return;
    setLoadingContacts(true);
    try {
      // Fetch all admin profiles with specialty/subspecialty names
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id, email, role, primary_specialty_id, primary_subspecialty_id,
          specialties:primary_specialty_id(id, name),
          subspecialties:primary_subspecialty_id(id, name)
        `)
        .in('role', [USER_ROLES.SUPER_ADMIN, USER_ROLES.SPECIALTY_ADMIN, USER_ROLES.SUBSPECIALTY_ADMIN])
        .neq('id', currentUser.id);

      if (error) throw error;

      // Flatten specialty/subspecialty names onto each profile
      (profiles || []).forEach(p => {
        p.specialtyName = p.specialties?.name || null;
        p.subspecialtyName = p.subspecialties?.name || null;
      });

      // Filter by visibility rules
      let reachable = [];
      if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
        reachable = profiles || [];
      } else if (currentUser.role === USER_ROLES.SPECIALTY_ADMIN) {
        reachable = (profiles || []).filter(p =>
          p.role === USER_ROLES.SUPER_ADMIN ||
          (p.role === USER_ROLES.SUBSPECIALTY_ADMIN && p.primary_specialty_id === currentUser.specialtyId)
        );
      } else if (currentUser.role === USER_ROLES.SUBSPECIALTY_ADMIN) {
        reachable = (profiles || []).filter(p =>
          p.role === USER_ROLES.SUPER_ADMIN ||
          (p.role === USER_ROLES.SPECIALTY_ADMIN && p.primary_specialty_id === currentUser.specialtyId) ||
          (p.role === USER_ROLES.SUBSPECIALTY_ADMIN && p.primary_specialty_id === currentUser.specialtyId)
        );
      }

      // For each contact, fetch the last message and unread count
      const contactsWithMeta = await Promise.all(
        reachable.map(async (contact) => {
          const { data: lastMsg } = await supabase
            .from('admin_messages')
            .select('body, created_at, sender_id')
            .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${contact.id}),and(sender_id.eq.${contact.id},recipient_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from('admin_messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', contact.id)
            .eq('recipient_id', currentUser.id)
            .is('read_at', null);

          return {
            ...contact,
            lastMessage: lastMsg?.[0] || null,
            unreadCount: count || 0,
          };
        })
      );

      // Sort: contacts with unread first, then by last message time
      contactsWithMeta.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        const aTime = a.lastMessage?.created_at || '';
        const bTime = b.lastMessage?.created_at || '';
        return bTime.localeCompare(aTime);
      });

      setContacts(contactsWithMeta);
    } catch (err) {
      console.error('Error loading messaging contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [isAdminUser, currentUser?.id, currentUser?.role, currentUser?.specialtyId]);

  // Load conversation with a specific contact
  const loadConversation = useCallback(async (contactId) => {
    if (!currentUser?.id || !contactId) return;
    setLoadingMessages(true);
    setActiveContactId(contactId);
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark incoming messages as read
      const unreadIds = (data || [])
        .filter(m => m.sender_id === contactId && m.recipient_id === currentUser.id && !m.read_at)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('admin_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);

        // Update contact unread count
        setContacts(prev => prev.map(c =>
          c.id === contactId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUser?.id]);

  // Send a message
  const sendMessage = useCallback(async (recipientId, body) => {
    if (!currentUser?.id || !recipientId || !body?.trim()) return;

    const trimmedBody = body.trim();
    if (trimmedBody.length > 5000) return; // Max message length

    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: recipientId,
          body: trimmedBody,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local messages if this is the active conversation
      if (recipientId === activeContactId) {
        setMessages(prev => [...prev, data]);
      }

      // Update contact's last message
      setContacts(prev => prev.map(c =>
        c.id === recipientId
          ? { ...c, lastMessage: { body: trimmedBody, created_at: data.created_at, sender_id: currentUser.id } }
          : c
      ));

      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [currentUser?.id, activeContactId]);

  // Load total unread count
  const loadUnreadCount = useCallback(async () => {
    if (!currentUser?.id || !isAdminUser) return;
    try {
      const { count, error } = await supabase
        .from('admin_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', currentUser.id)
        .is('read_at', null);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, [currentUser?.id, isAdminUser]);

  // Set up realtime subscription
  useEffect(() => {
    if (!currentUser?.id || !isAdminUser) return;

    const channel = supabase
      .channel('admin-messages-' + currentUser.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newMsg = payload.new;

          // If this message is from the active conversation, add it and mark as read
          if (newMsg.sender_id === activeContactId) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read immediately
            supabase
              .from('admin_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then();
          } else {
            // Increment unread count
            setUnreadCount(prev => prev + 1);
          }

          // Update contact list
          setContacts(prev => prev.map(c =>
            c.id === newMsg.sender_id
              ? {
                  ...c,
                  lastMessage: { body: newMsg.body, created_at: newMsg.created_at, sender_id: newMsg.sender_id },
                  unreadCount: newMsg.sender_id === activeContactId ? 0 : c.unreadCount + 1,
                }
              : c
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUser?.id, isAdminUser, activeContactId]);

  // Initial load
  useEffect(() => {
    if (isAdminUser) {
      loadContacts();
      loadUnreadCount();
    }
  }, [isAdminUser, loadContacts, loadUnreadCount]);

  return {
    contacts,
    activeContactId,
    messages,
    unreadCount,
    loadingContacts,
    loadingMessages,
    loadContacts,
    loadConversation,
    sendMessage,
    loadUnreadCount,
    setActiveContactId,
  };
}
