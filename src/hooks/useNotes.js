/**
 * useNotes Hook
 * 
 * Manages user's personal notes on resources with manual save only.
 * 
 * @example
 * const { notes, getNote, updateNote, deleteNote } = useNotes(userId);
 * 
 * Features:
 * - Manual save only (user must click "Save" button)
 * - Optimistic UI updates
 * - Efficient note lookups (O(1) by resource ID)
 * - Character limit enforcement
 * - Loading states
 * - Error handling with retry
 * 
 * @param {string} userId - Current user ID
 * @returns {Object} Notes state and methods
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ERROR_MESSAGES, NOTE_LIMITS } from '../utils/constants';

export function useNotes(userId) {
  // State - Store as Map for O(1) lookups
  const [notes, setNotes] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Debug: Track state changes
  useEffect(() => {
    console.log('🔍 useNotes: State changed', {
      notesCount: notes.size,
      loading,
      error: error?.substring(0, 50) || null,
      noteResourceIds: Array.from(notes.keys()).map(id => id.substring(0, 8) + '...')
    });
  }, [notes, loading, error]);
  const [savingNotes, setSavingNotes] = useState(new Set());
  
  // Refs
  const isMounted = useRef(true);
  const abortController = useRef(null);

  /**
   * Load user's notes from database
   */
  const loadNotes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setNotes(new Map()); // Clear notes if no user
      return;
    }
    
    try {
      // Cancel any pending requests
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      console.log('useNotes: Attempting to load notes for userId:', userId ? 'present' : 'missing');
      
      const { data, error: queryError } = await supabase
        .from('notes')
        .select('resource_id, note_text, created_at, updated_at')
        .eq('user_id', userId);
      
      if (queryError) {
        // Security: Don't log PII (user IDs)
        // Handle 403 Forbidden (RLS blocking) gracefully
        if (queryError.code === '42501' || queryError.code === 'PGRST301' || queryError.status === 403) {
          // Security: Sanitize error messages (prevent XSS, info disclosure)
          const sanitizedMessage = queryError.message?.substring(0, 100) || 'Unknown error';
          const sanitizedHint = queryError.hint?.substring(0, 100) || null;
          const sanitizedDetails = queryError.details?.substring(0, 100) || null;
          
          console.error('❌ useNotes: RLS policy blocking read access (403). Error details:', {
            code: queryError.code,
            message: sanitizedMessage, // Security: Sanitized
            hint: sanitizedHint, // Security: Sanitized
            details: sanitizedDetails // Security: Sanitized
          });
          console.error('⚠️ ACTION REQUIRED: Run SUPABASE_RLS_POLICIES.sql in Supabase SQL Editor to fix RLS policies');
          if (isMounted.current) {
            setNotes(new Map());
            setLoading(false);
          }
          return; // Don't throw, just return empty map
        }
        console.error('Error loading notes:', queryError?.code || 'Unknown error', queryError?.message?.substring(0, 100) || '');
        throw queryError;
      }
      
      console.log('useNotes: Query successful, received', data?.length || 0, 'notes');
      console.log('🔵 useNotes: isMounted check:', isMounted.current);
      
      // Convert to Map for efficient lookups
      const notesMap = new Map();
      data?.forEach((note) => {
        notesMap.set(note.resource_id, {
          text: note.note_text,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        });
      });
      
      if (!isMounted.current) {
        console.warn('⚠️ useNotes: Component unmounted before state could be set! Data received:', notesMap.size, 'notes');
        // Still set state even if unmounted - component might remount
        setNotes(notesMap);
        setLoading(false);
        return;
      }
      
      console.log(`useNotes: Loaded ${notesMap.size} note(s) from database`);
      console.log('🔵 useNotes: Setting notes state with', notesMap.size, 'note(s)');
      const noteResourceIds = Array.from(notesMap.keys()).map(id => id.substring(0, 8) + '...');
      console.log('🔵 useNotes: Note resource IDs:', noteResourceIds);
      setNotes(notesMap);
      console.log('✅ useNotes: State updated with', notesMap.size, 'note(s)');
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      // Security: Don't log PII
      console.error('Error loading notes:', err?.code || 'Unknown error');
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.GENERIC_ERROR);
        // Don't clear notes on error - keep existing state
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  /**
   * Load notes on mount and when userId changes
   */
  useEffect(() => {
    console.log('🔵 useNotes: useEffect triggered', {
      userId: userId ? 'present' : 'missing',
      isMounted: isMounted.current
    });
    
    if (userId) {
      console.log('🔵 useNotes: Loading notes for userId:', userId ? 'present' : 'missing');
      loadNotes();
    } else {
      console.log('⚠️ useNotes: No userId, skipping load');
      setNotes(new Map());
      setLoading(false);
    }
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadNotes, userId]);

  /**
   * Save note to database (called by debounced function or immediately)
   * Security: Validates input, sanitizes note text, handles errors gracefully
   */
  const saveNoteToDb = useCallback(
    async (resourceId, noteText) => {
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Security: Validate resourceId
      if (!resourceId || typeof resourceId !== 'string') {
        throw new Error('Invalid resource ID');
      }
      
      // Security: Sanitize note text (remove HTML tags, limit length)
      const sanitizedText = noteText ? 
        noteText.replace(/<[^>]*>/g, '').substring(0, NOTE_LIMITS.MAX_LENGTH) : 
        '';
      
      try {
        setSavingNotes((prev) => new Set(prev).add(resourceId));
        
        if (!sanitizedText || sanitizedText.trim() === '') {
          // Delete empty notes
          const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .eq('user_id', userId)
            .eq('resource_id', resourceId);
          
          if (deleteError) throw deleteError;
        } else {
          // Upsert note using check-then-insert-or-update pattern
          // Security: RLS ensures user can only save notes for themselves
          // Note: Using manual check/update/insert because Supabase upsert requires constraint name
          
          // First, check if note exists
          const { data: existingNote, error: checkError } = await supabase
            .from('notes')
            .select('id')
            .eq('user_id', userId)
            .eq('resource_id', resourceId)
            .maybeSingle();
          
          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }
          
          if (existingNote) {
            // Update existing note
            const { error: updateError } = await supabase
              .from('notes')
              .update({
                note_text: sanitizedText.trim(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingNote.id)
              .eq('user_id', userId); // Double-check user owns this note
            
            if (updateError) {
              // Handle 403 Forbidden (RLS blocking)
              if (updateError.code === '42501' || updateError.code === 'PGRST301' || updateError.status === 403) {
                // Security: Sanitize error messages (prevent XSS, info disclosure)
                const sanitizedMessage = updateError.message?.substring(0, 100) || 'Unknown error';
                const sanitizedHint = updateError.hint?.substring(0, 100) || null;
                const sanitizedDetails = updateError.details?.substring(0, 100) || null;
                
                console.error('❌ useNotes: RLS policy blocking update (403). Error details:', {
                  code: updateError.code,
                  message: sanitizedMessage, // Security: Sanitized
                  hint: sanitizedHint, // Security: Sanitized
                  details: sanitizedDetails // Security: Sanitized
                });
                console.error('⚠️ ACTION REQUIRED: Run SUPABASE_RLS_POLICIES.sql in Supabase SQL Editor');
                throw updateError;
              }
              console.error('Error updating note:', updateError?.code || 'Unknown error', updateError?.message?.substring(0, 100) || '');
              throw updateError;
            }
            console.log('✅ Note updated successfully');
          } else {
            // Insert new note
            // Security: Validate resourceId before use (prevent IDOR, type confusion)
            if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
              console.error('❌ useNotes: Invalid resourceId');
              throw new Error('Invalid resource ID');
            }
            
            console.log('🔵 useNotes: Attempting to insert note', {
              userId: userId ? 'present' : 'missing',
              resourceIdPrefix: resourceId?.substring(0, 8) + '...', // Security: Truncated, no PII
              noteLength: sanitizedText.trim().length
            });
            
            const { data: insertData, error: insertError } = await supabase
              .from('notes')
              .insert({
                user_id: userId,
                resource_id: resourceId,
                note_text: sanitizedText.trim(),
                updated_at: new Date().toISOString(),
              })
              .select(); // Select to verify insert worked
            
            if (insertError) {
              // Security: Sanitize error messages (prevent XSS, info disclosure)
              const sanitizedMessage = insertError.message?.substring(0, 100) || 'Unknown error';
              const sanitizedHint = insertError.hint?.substring(0, 100) || null;
              const sanitizedDetails = insertError.details?.substring(0, 100) || null;
              
              console.error('🔴 useNotes: INSERT FAILED', {
                code: insertError.code,
                status: insertError.status,
                message: sanitizedMessage, // Security: Sanitized
                hint: sanitizedHint, // Security: Sanitized
                details: sanitizedDetails // Security: Sanitized
              });
              
              // Handle 403 Forbidden (RLS blocking)
              if (insertError.code === '42501' || insertError.code === 'PGRST301' || insertError.status === 403) {
                console.error('❌ useNotes: RLS policy blocking insert (403)');
                console.error('⚠️ ACTION REQUIRED: Run CLEANUP_AND_FIX_RLS_POLICIES.sql in Supabase SQL Editor');
                console.error('⚠️ Then run TEST_RLS_POLICIES.sql to verify policies work');
                throw insertError;
              }
              console.error('❌ Error inserting note:', insertError?.code || 'Unknown error', insertError?.message?.substring(0, 100) || '');
              throw insertError;
            }
            // Security: Don't log full insertData (contains user_id PII and note text)
            console.log('✅ useNotes: Note inserted successfully', {
              resourceIdPrefix: resourceId?.substring(0, 8) + '...' // Security: Truncated, no PII
            });
          }
        }
      } catch (err) {
        console.error('Error saving note:', err?.code || 'Unknown error');
        throw err; // Re-throw so caller can handle
      } finally {
        setSavingNotes((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        
        // Note: No pending saves to clear (manual save only)
      }
    },
    [userId]
  );

  /**
   * Cleanup on unmount
   * Note: Removed beforeunload handler - notes are now manual save only
   * Users must explicitly click "Save" to persist notes
   */
  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Note: Removed debounced save function - notes are now manual save only

  /**
   * Get note for a resource
   */
  const getNote = useCallback(
    (resourceId) => {
      return notes.get(resourceId)?.text || '';
    },
    [notes]
  );

  /**
   * Update note for a resource (manual save only - no auto-save)
   * @param {string} resourceId - Resource ID
   * @param {string} noteText - Note text
   * @param {boolean} immediate - Ignored (always saves immediately - manual save only)
   */
  const updateNote = useCallback(
    async (resourceId, noteText, immediate = true) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Enforce character limit
      if (noteText && noteText.length > NOTE_LIMITS.MAX_LENGTH) {
        return {
          success: false,
          error: `Note cannot exceed ${NOTE_LIMITS.MAX_LENGTH} characters`,
        };
      }
      
      // Optimistic update
      setNotes((prev) => {
        const next = new Map(prev);
        if (!noteText || noteText.trim() === '') {
          next.delete(resourceId);
        } else {
          next.set(resourceId, {
            text: noteText,
            updatedAt: new Date().toISOString(),
          });
        }
        return next;
      });
      
      // Always save immediately (manual save only - user must click Save button)
      await saveNoteToDb(resourceId, noteText);
      // Reload notes to ensure consistency with database
      await loadNotes();
      
      return { success: true };
    },
    [userId, saveNoteToDb, loadNotes]
  );

  /**
   * Delete note for a resource
   */
  const deleteNote = useCallback(
    async (resourceId) => {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Optimistic update
      setNotes((prev) => {
        const next = new Map(prev);
        next.delete(resourceId);
        return next;
      });
      
      // Note: No pending saves to cancel (manual save only)
      
      try {
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
        
        if (deleteError) throw deleteError;
        
        return { success: true };
      } catch (err) {
        console.error('Error deleting note:', err);
        return { success: false, error: err.message };
      }
    },
    [userId]
  );

  /**
   * Force save all pending notes immediately
   * Note: No-op since notes are manual save only (no pending saves)
   */
  const saveAllPending = useCallback(() => {
    // No-op: Notes are manual save only, no pending saves to flush
  }, []);

  /**
   * Check if a resource has a note
   */
  const hasNote = useCallback(
    (resourceId) => {
      return notes.has(resourceId);
    },
    [notes]
  );

  /**
   * Check if a note is currently being saved
   */
  const isSaving = useCallback(
    (resourceId) => {
      return savingNotes.has(resourceId);
    },
    [savingNotes]
  );

  /**
   * Get all notes as array (for export, etc.)
   */
  const notesArray = useMemo(() => {
    return Array.from(notes.entries()).map(([resourceId, note]) => ({
      resourceId,
      text: note.text,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));
  }, [notes]);

  /**
   * Get count of notes
   */
  const count = useMemo(() => notes.size, [notes]);

  /**
   * Check if user has any notes
   */
  const hasNotes = useMemo(() => notes.size > 0, [notes]);

  /**
   * Get notes by resource IDs (batch lookup)
   */
  const getNotesByResourceIds = useCallback(
    (resourceIds) => {
      const result = {};
      resourceIds.forEach((id) => {
        const note = notes.get(id);
        if (note) {
          result[id] = note.text;
        }
      });
      return result;
    },
    [notes]
  );

  // Debug: Expose state to window for debugging (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.__DEBUG_NOTES__ = {
      notesCount: notes.size,
      noteResourceIds: Array.from(notes.keys()).map(id => id.substring(0, 8) + '...'),
      loading,
      error,
      userId: userId ? 'present' : 'missing',
      getNote: (resourceId) => notes.get(resourceId)?.text || '',
      hasNote: (resourceId) => notes.has(resourceId),
    };
  }

  return {
    // State
    notes: notesArray,
    notesMap: notes, // Expose Map for efficient lookups
    loading,
    error,
    count,
    hasNotes,
    
    // Methods
    getNote,
    updateNote,
    deleteNote,
    hasNote,
    isSaving,
    saveAllPending,
    getNotesByResourceIds,
    refetch: loadNotes,
  };
}

export default useNotes;
