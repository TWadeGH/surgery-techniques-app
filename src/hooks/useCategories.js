/**
 * useCategories Hook
 * Manages category and procedure fetching based on user's specialty/subspecialty.
 * Extracted from App.jsx to improve code organization.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SPECIALTY_SUBSPECIALTY } from '../utils/constants';
import { validateCategoryId } from '../utils/validators';
import { trackCategorySelection } from '../lib/analytics';
import { includeInAnalytics } from '../utils/helpers';

export function useCategories(currentUser, browsingSubspecialtyId = null) {
  const [categories, setCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [availableSubspecialties, setAvailableSubspecialties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Track if we've loaded data to prevent duplicate fetches
  const dataLoadedRef = useRef(false);
  const lastLoadedProfileRef = useRef({ specialtyId: null, subspecialtyId: null, browsingSubspecialtyId: null });

  /**
   * Fetch categories and procedures for the user based on their specialty/subspecialty.
   * Handles special cases: Generalist, General Orthopedics, Podiatry.
   */
  const fetchCategoriesAndProcedures = useCallback(async (user, browsingOverride = null) => {
    let loadAll = false;
    let loadAllOrthopedicSurgery = false;
    let effectiveSubspecialtyId = browsingOverride ?? user?.subspecialtyId ?? null;
    let effectiveSubspecialtyName = null;

    // Check if we're browsing a subspecialty
    if (effectiveSubspecialtyId) {
      const { data: sub } = await supabase
        .from('subspecialties')
        .select('name, specialty_id, specialties!inner(name)')
        .eq('id', effectiveSubspecialtyId)
        .maybeSingle();

      if (sub) {
        effectiveSubspecialtyName = (sub.name || '').toLowerCase();
        const specialtyName = (sub.specialties?.name || '').toLowerCase();

        // Check if this is General Orthopedics/Generalist under Orthopedic Surgery
        const isGeneralOrthopedics =
          (effectiveSubspecialtyName === SPECIALTY_SUBSPECIALTY.GENERALIST ||
            (effectiveSubspecialtyName.includes('general') && effectiveSubspecialtyName.includes('orthopedic'))) &&
          (specialtyName.includes('orthopedic') || specialtyName.includes('orthopaedic'));

        if (isGeneralOrthopedics) {
          loadAllOrthopedicSurgery = true;
          effectiveSubspecialtyId = null;
        }
      }
    }

    // Legacy check for user's profile subspecialty (if not browsing)
    if (!browsingOverride && user?.subspecialtyId) {
      const { data: sub } = await supabase
        .from('subspecialties')
        .select('name, specialty_id, specialties!inner(name)')
        .eq('id', user.subspecialtyId)
        .maybeSingle();

      if (sub) {
        const name = (sub.name || '').toLowerCase();
        const specialtyName = (sub.specialties?.name || '').toLowerCase();

        const isGeneralOrthopedics =
          (name === SPECIALTY_SUBSPECIALTY.GENERALIST ||
            (name.includes('general') && name.includes('orthopedic'))) &&
          (specialtyName.includes('orthopedic') || specialtyName.includes('orthopaedic'));

        if (isGeneralOrthopedics) {
          loadAllOrthopedicSurgery = true;
          effectiveSubspecialtyId = null;
        } else if (name === SPECIALTY_SUBSPECIALTY.GENERALIST) {
          loadAll = true;
          effectiveSubspecialtyId = null;
        }
      }
    } else if (user?.specialtyId && !effectiveSubspecialtyId) {
      // Handle Podiatry special case
      const { data: spec } = await supabase
        .from('specialties')
        .select('name')
        .eq('id', user.specialtyId)
        .maybeSingle();
      const specName = (spec?.name || '').toLowerCase();

      if (specName === SPECIALTY_SUBSPECIALTY.PODIATRY) {
        let ortho = null;
        for (const orthoName of [SPECIALTY_SUBSPECIALTY.ORTHOPAEDIC_SURGERY, SPECIALTY_SUBSPECIALTY.ORTHOPEDIC_SURGERY]) {
          const { data } = await supabase
            .from('specialties')
            .select('id')
            .ilike('name', orthoName)
            .limit(1)
            .maybeSingle();
          if (data?.id) {
            ortho = data;
            break;
          }
        }
        if (ortho?.id) {
          const { data: fa } = await supabase
            .from('subspecialties')
            .select('id')
            .eq('specialty_id', ortho.id)
            .ilike('name', SPECIALTY_SUBSPECIALTY.FOOT_AND_ANKLE)
            .limit(1)
            .maybeSingle();
          if (fa?.id) effectiveSubspecialtyId = fa.id;
        }
      }
      if (!effectiveSubspecialtyId) loadAll = true;
    } else if (!effectiveSubspecialtyId) {
      loadAll = true;
    }

    // Fetch categories based on determined scope
    let categoriesData = [];
    if (loadAll) {
      const { data } = await supabase.from('categories').select('*').order('order');
      categoriesData = data || [];
    } else if (loadAllOrthopedicSurgery) {
      let orthoSpecialtyId = null;
      for (const orthoName of [SPECIALTY_SUBSPECIALTY.ORTHOPAEDIC_SURGERY, SPECIALTY_SUBSPECIALTY.ORTHOPEDIC_SURGERY]) {
        const { data } = await supabase
          .from('specialties')
          .select('id')
          .ilike('name', orthoName)
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          orthoSpecialtyId = data.id;
          break;
        }
      }

      if (orthoSpecialtyId) {
        const { data: orthoSubspecialties } = await supabase
          .from('subspecialties')
          .select('id')
          .eq('specialty_id', orthoSpecialtyId);

        if (orthoSubspecialties && orthoSubspecialties.length > 0) {
          const { data } = await supabase
            .from('categories')
            .select('*')
            .in('subspecialty_id', orthoSubspecialties.map(s => s.id))
            .order('order');
          categoriesData = data || [];
        }
      }
    } else if (effectiveSubspecialtyId) {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('subspecialty_id', effectiveSubspecialtyId)
        .order('order');
      categoriesData = data || [];
    }

    // Fetch procedures for the loaded categories
    let proceduresData = [];
    if (categoriesData.length > 0) {
      const { data } = await supabase
        .from('procedures')
        .select('*')
        .in('category_id', categoriesData.map((c) => c.id));
      proceduresData = data || [];
    }

    return { categoriesData, proceduresData };
  }, []);

  /**
   * Load available subspecialties for the browsing dropdown
   */
  const loadAvailableSubspecialties = useCallback(async () => {
    if (!currentUser?.specialtyId) return;

    try {
      const { data, error } = await supabase
        .from('subspecialties')
        .select('id, name')
        .eq('specialty_id', currentUser.specialtyId)
        .order('name');

      if (error) {
        console.error('Error loading subspecialties:', error);
        return;
      }

      // Validate subspecialties
      const validatedSubspecialties = (data || []).filter(sub => {
        const validation = sub.id && typeof sub.id === 'string' && sub.id.length <= 100;
        return validation;
      });

      setAvailableSubspecialties(validatedSubspecialties);
    } catch (err) {
      console.error('Error loading subspecialties:', err);
    }
  }, [currentUser?.specialtyId]);

  /**
   * Select a category with validation
   */
  const selectCategory = useCallback((categoryId) => {
    if (categoryId === null) {
      setSelectedCategoryId(null);
      if (includeInAnalytics(currentUser)) {
        trackCategorySelection(currentUser?.subspecialtyId, null);
      }
      return;
    }

    const validation = validateCategoryId(categoryId, categories);
    if (!validation.isValid) {
      console.warn('Invalid category selection:', validation.error);
      return;
    }

    setSelectedCategoryId(categoryId);
    if (includeInAnalytics(currentUser)) {
      trackCategorySelection(currentUser?.subspecialtyId, categoryId);
    }
  }, [categories, currentUser]);

  /**
   * Refresh categories when browsing subspecialty changes
   */
  const refreshForSubspecialty = useCallback(async (subspecialtyId) => {
    setLoading(true);
    try {
      const { categoriesData, proceduresData } = await fetchCategoriesAndProcedures(currentUser, subspecialtyId);
      setCategories(categoriesData);
      setProcedures(proceduresData);
      setSelectedCategoryId(null);
    } catch (err) {
      console.error('Error refreshing categories:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchCategoriesAndProcedures]);

  /**
   * Initial load when user or browsing subspecialty changes
   */
  useEffect(() => {
    if (!currentUser?.id) return;

    const profileKey = {
      specialtyId: currentUser.specialtyId,
      subspecialtyId: currentUser.subspecialtyId,
      browsingSubspecialtyId
    };

    // Skip if already loaded with same profile
    const lastKey = lastLoadedProfileRef.current;
    if (
      dataLoadedRef.current &&
      lastKey.specialtyId === profileKey.specialtyId &&
      lastKey.subspecialtyId === profileKey.subspecialtyId &&
      lastKey.browsingSubspecialtyId === profileKey.browsingSubspecialtyId
    ) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const { categoriesData, proceduresData } = await fetchCategoriesAndProcedures(currentUser, browsingSubspecialtyId);
        setCategories(categoriesData);
        setProcedures(proceduresData);
        dataLoadedRef.current = true;
        lastLoadedProfileRef.current = profileKey;
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.id, currentUser?.specialtyId, currentUser?.subspecialtyId, browsingSubspecialtyId, fetchCategoriesAndProcedures]);

  /**
   * Load available subspecialties on mount
   */
  useEffect(() => {
    loadAvailableSubspecialties();
  }, [loadAvailableSubspecialties]);

  return {
    categories,
    procedures,
    selectedCategoryId,
    selectCategory,
    availableSubspecialties,
    refreshForSubspecialty,
    loading,
    // Expose setters for backwards compatibility during migration
    setCategories,
    setProcedures,
  };
}
