/**
 * useNotes Hook
 * 
 * Manages user's personal notes on resources with auto-save,
 * optimistic updates, and debounced persistence.
 * 
 * @example
 * const { notes, getNote, updateNote, deleteNote } = useNotes(userId);
 * 
 * Features:
 * - Auto-save with debouncing (saves 1 second after typing stops)
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
import { debounce } from '../utils/helpers';

export function useNotes(userId) {
  // State - Store as Map for O(1) lookups
  const [notes, setNotes] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingNotes, setSavingNotes] = useState(new Set());
  
  // Refs
  const isMounted = useRef(true);
  const abortController = useRef(null);
  const pendingSaves = useRef(new Map()); // Track debounced saves

  /**
   * Load user's notes from database
   */
  const loadNotes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
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
      
      console.log('Loading notes for user:', userId);
      
      const { data, error: queryError } = await supabase
        .from('notes')
        .select('resource_id, note_text, created_at, updated_at')
        .eq('user_id', userId);
      
      if (queryError) throw queryError;
      
      if (!isMounted.current) return;
      
      // Convert to Map for efficient lookups
      const notesMap = new Map();
      data?.forEach((note) => {
        notesMap.set(note.resource_id, {
          text: note.note_text,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        });
      });
      
      setNotes(notesMap);
      
      console.log(`Loaded ${notesMap.size} notes`);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error('Error loading notes:', err);
      if (isMounted.current) {
        setError(err.message || ERROR_MESSAGES.GENERIC_ERROR);
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
    loadNotes();
    
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [loadNotes]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
      // Save any pending notes before unmounting
      pendingSaves.current.forEach((saveFunc) => saveFunc.flush());
    };
  }, []);

  /**
   * Save note to database (called by debounced function)
   */
  const saveNoteToDb = useCallback(
    async (resourceId, noteText) => {
      if (!userId) return;
      
      try {
        setSavingNotes((prev) => new Set(prev).add(resourceId));
        
        if (!noteText || noteText.trim() === '') {
          // Delete empty notes
          const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .eq('user_id', userId)
            .eq('resource_id', resourceId);
          
          if (deleteError) throw deleteError;
          
          console.log('Deleted empty note for resource:', resourceId);
        } else {
          // Upsert note
          const { error: upsertError } = await supabase
            .from('notes')
            .upsert(
              {
                user_id: userId,
                resource_id: resourceId,
                note_text: noteText,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'user_id,resource_id',
              }
            );
          
          if (upsertError) throw upsertError;
          
          console.log('Saved note for resource:', resourceId);
        }
      } catch (err) {
        console.error('Error saving note:', err);
        // Don't throw - we'll retry on next update
      } finally {
        setSavingNotes((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        
        // Clear pending save
        pendingSaves.current.delete(resourceId);
      }
    },
    [userId]
  );

  /**
   * Create debounced save function for a resource
   */
  const getDebouncedSave = useCallback(
    (resourceId) => {
      if (!pendingSaves.current.has(resourceId)) {
        const debouncedFn = debounce(
          (text) => saveNoteToDb(resourceId, text),
          1000 // Save 1 second after typing stops
        );
        pendingSaves.current.set(resourceId, debouncedFn);
      }
      return pendingSaves.current.get(resourceId);
    },
    [saveNoteToDb]
  );

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
   * Update note for a resource (with auto-save)
   */
  const updateNote = useCallback(
    (resourceId, noteText) => {
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
      
      // Debounced save to database
      const debouncedSave = getDebouncedSave(resourceId);
      debouncedSave(noteText);
      
      return { success: true };
    },
    [userId, getDebouncedSave]
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
      
      // Cancel pending save
      const debouncedSave = pendingSaves.current.get(resourceId);
      if (debouncedSave) {
        debouncedSave.cancel();
        pendingSaves.current.delete(resourceId);
      }
      
      try {
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
        
        if (deleteError) throw deleteError;
        
        console.log('Deleted note for resource:', resourceId);
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
   */
  const saveAllPending = useCallback(() => {
    pendingSaves.current.forEach((saveFunc) => {
      saveFunc.flush(); // Execute immediately
    });
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
