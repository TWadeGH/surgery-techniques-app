// Build v4 - Final test
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// Icons are now imported in individual components - no longer needed here
import { supabase } from './lib/supabase';
import { 
  trackResourceCoview,
  trackSearchQuery,
  trackCategorySelection,
  trackRatingEvent,
  endAnalyticsSession 
} from './lib/analytics';
import { processResourceImage } from './lib/imageUtils';
import Onboarding from './Onboarding';

// Import custom hooks
import { 
  useAuth, 
  useResources, 
  useFavorites, 
  useNotes, 
  useUpcomingCases 
} from './hooks';

// Import utilities
import { isAdmin, canRateOrFavorite, isSurgeon, includeInAnalytics } from './utils/helpers';
import { VIEW_MODES, USER_TYPES, ADMIN_TABS, RESOURCE_TYPES, SPECIALTY_SUBSPECIALTY, ADMIN_ACTION_TYPES } from './utils/constants';
import { logAdminAction } from './utils/adminAudit';
import { validateCategoryId, validateUuid } from './utils/validators';

// Import components
import Header from './components/layout/Header';
import ResourceFilters from './components/resources/ResourceFilters';
import ResourceList from './components/resources/ResourceList';
import ResourceCard from './components/resources/Resourcecard';
import { SuggestResourceModal } from './components/resources';
import { LoginView, UserView, RepView } from './components/views';
import { ErrorBoundary, useToast, ConfirmDialog } from './components/common';

// Admin Components
import { AdminView } from './components/admin';

// Modal Components
import {
  AddResourceModal,
  EditResourceModal,
  CategoryManagementModal,
  SuggestedResourcesModal,
  SettingsModal,
  ReportResourceModal,
  ReportedResourcesModal,
  SponsorshipInquiryModal
} from './components/modals';
import { LegalModal, TermsAcceptanceModal } from './components/legal';

function SurgicalTechniquesApp() {
  // Toast notifications
  const toast = useToast();
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ========================================
  // CUSTOM HOOKS - Replaces 2000+ lines of code!
  // ========================================
  
  // Authentication (replaces ~500 lines)
  const { 
    currentUser, 
    loading: authLoading,
    updateProfile,
    signOut,
    refreshSession,
    refreshProfile
  } = useAuth();
  
  // Use authLoading as the main loading state
  const loading = authLoading;
  
  // Stabilize userId to prevent hook re-initialization on every currentUser change
  const userId = useMemo(() => currentUser?.id, [currentUser?.id]);

  // Resources (will be integrated after categories work)
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Favorites, Notes, Upcoming Cases
  const { isFavorited, toggleFavorite } = useFavorites(userId, { trackAnalytics: includeInAnalytics(currentUser) });
  const { getNote, updateNote } = useNotes(userId);
  const {
    upcomingCases,
    toggleCase: toggleUpcomingCase,
    reorderCases: reorderUpcomingCases,
    isInUpcomingCases,
  } = useUpcomingCases(userId);

  // ========================================
  // LOCAL STATE (Non-hook state)
  // ========================================

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [legalPage, setLegalPage] = useState(null);
  const [currentView, setCurrentView] = useState(VIEW_MODES.USER);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      const isDark = saved === 'true';
      console.log('Initial dark mode state from localStorage:', saved, '→', isDark);
      return isDark;
    }
    return false;
  });
  const [adminTab, setAdminTab] = useState('resources');
  const [suggestedResources, setSuggestedResources] = useState([]);
  const [showSuggestedResources, setShowSuggestedResources] = useState(false);
  const [reportedResources, setReportedResources] = useState([]);
  const [showReportedResources, setShowReportedResources] = useState(false);
  const [showSponsorshipInquiry, setShowSponsorshipInquiry] = useState(false);
  const [sponsorshipPendingCount, setSponsorshipPendingCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [resourceToReport, setResourceToReport] = useState(null);
  const [showUpcomingCases, setShowUpcomingCases] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [draggedResourceId, setDraggedResourceId] = useState(null);
  const [draggedUpcomingCaseId, setDraggedUpcomingCaseId] = useState(null);
  // Browse by subspecialty feature - allows temporary browsing without changing profile
  const [browsingSubspecialtyId, setBrowsingSubspecialtyId] = useState(null); // null = use profile subspecialty
  const [availableSubspecialties, setAvailableSubspecialties] = useState([]); // All subspecialties for dropdown

  // Apply dark mode
  useEffect(() => {
    console.log('Dark mode changed to:', darkMode);
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
      console.log('Added dark class to documentElement, current classes:', html.className);
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
      console.log('Removed dark class from documentElement, current classes:', html.className);
    }
  }, [darkMode]);

  // Check onboarding status.
  // If onboarding_complete === true (from DB), skip onboarding (e.g. Podiatry has no subspecialty).
  // Otherwise require specialty and subspecialty so Podiatry/null-subspecialty users aren't stuck in onboarding.
  useEffect(() => {
    if (currentUser) {
      const hasOnboardingCompleteFlag = currentUser.onboardingComplete === true;
      const hasSpecialtyAndSubspecialty = currentUser.specialtyId && currentUser.subspecialtyId;

      if (hasOnboardingCompleteFlag) {
        setShowOnboarding(false);
      } else if (hasSpecialtyAndSubspecialty) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.specialtyId, currentUser?.subspecialtyId, currentUser?.onboardingComplete]);

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
    // Reload profile so currentUser gets updated specialty/subspecialty from DB
    try {
      await refreshProfile();
    } catch (err) {
      console.warn('Profile reload after onboarding failed (non-blocking):', err);
    }
  }, [refreshProfile]);

  /** Generalist → all categories; Podiatry (no subspecialty) → Foot and Ankle; else → user's subspecialty.
   * Special case: General Orthopedics → all Orthopedic Surgery categories.
   * Security: browsingSubspecialtyId allows temporary browsing without changing profile.
   * RLS policies ensure users can only access subspecialties they have permission to view.
   */
  const fetchCategoriesAndProceduresForUser = useCallback(async (user, browsingSubspecialtyIdOverride = null) => {
    let loadAll = false;
    let loadAllOrthopedicSurgery = false; // Special flag for General Orthopedics
    // Use browsing override if provided, otherwise use user's profile subspecialty
    let effectiveSubspecialtyId = browsingSubspecialtyIdOverride ?? user?.subspecialtyId ?? null;
    let effectiveSubspecialtyName = null;

    // Check if we're browsing a subspecialty (or using user's profile subspecialty)
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
           effectiveSubspecialtyName.includes('general') && effectiveSubspecialtyName.includes('orthopedic')) &&
          (specialtyName.includes('orthopedic') || specialtyName.includes('orthopaedic'));
        
        if (isGeneralOrthopedics) {
          // Load all categories from Orthopedic Surgery specialty (all subspecialties)
          loadAllOrthopedicSurgery = true;
          effectiveSubspecialtyId = null; // Clear to load all orthopedic categories
        }
      }
    }

    // Legacy check for user's profile subspecialty (if not browsing)
    if (!browsingSubspecialtyIdOverride && user?.subspecialtyId) {
      const { data: sub } = await supabase
        .from('subspecialties')
        .select('name, specialty_id, specialties!inner(name)')
        .eq('id', user.subspecialtyId)
        .maybeSingle();
      
      if (sub) {
        const name = (sub.name || '').toLowerCase();
        const specialtyName = (sub.specialties?.name || '').toLowerCase();
        
        // Check if user's profile is General Orthopedics/Generalist under Orthopedic Surgery
        const isGeneralOrthopedics = 
          (name === SPECIALTY_SUBSPECIALTY.GENERALIST ||
           name.includes('general') && name.includes('orthopedic')) &&
          (specialtyName.includes('orthopedic') || specialtyName.includes('orthopaedic'));
        
        if (isGeneralOrthopedics) {
          loadAllOrthopedicSurgery = true;
          effectiveSubspecialtyId = null;
        } else if (name === SPECIALTY_SUBSPECIALTY.GENERALIST) {
          // Generalist in other specialties → load all
          loadAll = true;
          effectiveSubspecialtyId = null;
        }
      }
    } else if (user?.specialtyId && !effectiveSubspecialtyId) {
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

    let categoriesData = [];
    if (loadAll) {
      // Load all categories (for true generalist or no subspecialty)
      const { data } = await supabase.from('categories').select('*').order('order');
      categoriesData = data || [];
    } else if (loadAllOrthopedicSurgery) {
      // Load all categories from Orthopedic Surgery specialty (all subspecialties)
      // First find Orthopedic Surgery specialty
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
        // Get all subspecialties under Orthopedic Surgery
        const { data: orthoSubspecialties } = await supabase
          .from('subspecialties')
          .select('id')
          .eq('specialty_id', orthoSpecialtyId);
        
        if (orthoSubspecialties && orthoSubspecialties.length > 0) {
          // Get all categories from all Orthopedic Surgery subspecialties
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

  // Define loadSuggestedResources first to avoid circular dependency
  const loadSuggestedResources = useCallback(async () => {
    console.log('🔵 loadSuggestedResources called', {
      isAdmin: isAdmin(currentUser),
      currentUser: currentUser ? { role: currentUser.role, subspecialtyId: currentUser.subspecialtyId } : null
    });
    try {
      if (!isAdmin(currentUser)) {
        console.log('⚠️ loadSuggestedResources: User is not admin, skipping');
        return;
      }

      console.log('🔵 loadSuggestedResources: Starting query...');
      let query = supabase
        .from('resource_suggestions')
        .select(`
          *,
          suggested_by_profile:profiles!suggested_by(
            id,
            email,
            primary_specialty_id,
            primary_subspecialty_id
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (currentUser.role === 'super_admin') {
        // Super admin sees all
        console.log('🔵 Loading suggestions: Super admin - seeing all');
      } else if (currentUser.role === 'specialty_admin' && currentUser.specialtyId) {
        query = query.eq('user_specialty_id', currentUser.specialtyId);
        console.log('🔵 Loading suggestions: Specialty admin - filtering by specialty:', currentUser.specialtyId);
      } else if (currentUser.role === 'subspecialty_admin' && currentUser.subspecialtyId) {
        query = query.eq('user_subspecialty_id', currentUser.subspecialtyId);
        console.log('🔵 Loading suggestions: Subspecialty admin - filtering by subspecialty:', currentUser.subspecialtyId);
      } else {
        console.warn('⚠️ Loading suggestions: Unknown admin role or missing IDs:', {
          role: currentUser.role,
          specialtyId: currentUser.specialtyId,
          subspecialtyId: currentUser.subspecialtyId
        });
      }

      const { data, error } = await query;
      
      console.log('🔵 Suggestions query result:', {
        count: data?.length || 0,
        error: error?.message,
        suggestions: data?.map(s => ({ id: s.id, title: s.title, user_subspecialty_id: s.user_subspecialty_id }))
      });

      if (error) {
        console.warn('Error loading with specialty columns, trying fallback:', error);
        const fallbackQuery = supabase
          .from('resource_suggestions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        setSuggestedResources(fallbackData || []);
        return;
      }
      
      setSuggestedResources(data || []);
    } catch (error) {
      console.error('Error loading suggested resources:', error);
      setSuggestedResources([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, currentUser?.specialtyId, currentUser?.subspecialtyId]); // Only depend on specific fields

  const loadReportedResources = useCallback(async () => {
    try {
      if (!isAdmin(currentUser)) return;
      let query = supabase
        .from('resource_reports')
        .select('*, resources(*)')
        .order('created_at', { ascending: false });
      if (currentUser.role === 'super_admin') {
        // see all
      } else if (currentUser.role === 'specialty_admin' && currentUser.specialtyId) {
        query = query.eq('resource_specialty_id', currentUser.specialtyId);
      } else if (currentUser.role === 'subspecialty_admin' && currentUser.subspecialtyId) {
        query = query.eq('resource_subspecialty_id', currentUser.subspecialtyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setReportedResources(data || []);
    } catch (error) {
      console.error('Error loading reported resources:', error);
      setReportedResources([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, currentUser?.specialtyId, currentUser?.subspecialtyId]);

  const loadAllData = useCallback(async () => {
    try {
      // Load resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      setResources(resourcesData || []);

      const { categoriesData, proceduresData } = await fetchCategoriesAndProceduresForUser(currentUser, browsingSubspecialtyId);
      setCategories(categoriesData);
      setProcedures(proceduresData);

      // Do not auto-select a category: show all resources until the user picks a category/subcategory
      // (selectedCategoryId stays null on load/refresh)

      // Load suggested and reported resources if user is an admin
      if (isAdmin(currentUser)) {
        console.log('🔵 fetchCategoriesAndProceduresForUser: Calling loadSuggestedResources for admin');
        try {
          await loadSuggestedResources();
        } catch (suggestionError) {
          console.error('❌ Error loading suggested resources (non-blocking):', suggestionError);
          console.error('❌ Error details:', {
            message: suggestionError?.message,
            code: suggestionError?.code,
            status: suggestionError?.status,
            details: suggestionError?.details
          });
        }
        try {
          await loadReportedResources();
        } catch (reportError) {
          console.error('Error loading reported resources (non-blocking):', reportError);
        }
      } else {
        console.log('⚠️ fetchCategoriesAndProceduresForUser: User is not admin, skipping loadSuggestedResources');
      }

    } catch (error) {
      console.error('Error loading data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.subspecialtyId, currentUser?.specialtyId, currentUser?.role, browsingSubspecialtyId, fetchCategoriesAndProceduresForUser, loadReportedResources]);

  // Load data when user is authenticated (moved after loadAllData definition)
  // Re-run when profile gains specialty/subspecialty so categories match (e.g. after profile load after timeout)
  const dataLoadedRef = useRef(false);
  const lastLoadedProfileRef = useRef({ specialtyId: null, subspecialtyId: null });
  useEffect(() => {
    if (!currentUser) {
      dataLoadedRef.current = false;
      lastLoadedProfileRef.current = { specialtyId: null, subspecialtyId: null };
      setBrowsingSubspecialtyId(null);
      setAvailableSubspecialties([]);
      return;
    }
    const hasProfile = currentUser.specialtyId != null || currentUser.subspecialtyId != null;
    const last = lastLoadedProfileRef.current;
    const profileChanged = last.specialtyId !== currentUser.specialtyId || last.subspecialtyId !== currentUser.subspecialtyId;
    if (hasProfile && profileChanged) {
      dataLoadedRef.current = false;
    }
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true;
      lastLoadedProfileRef.current = { specialtyId: currentUser.specialtyId ?? null, subspecialtyId: currentUser.subspecialtyId ?? null };
      loadAllData();
      loadAvailableSubspecialties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.specialtyId, currentUser?.subspecialtyId]);

  // Load suggested, reported resources, and sponsorship count when switching to Admin view
  useEffect(() => {
    if (currentView === VIEW_MODES.ADMIN && isAdmin(currentUser)) {
      loadSuggestedResources().catch(error => {
        console.error('❌ Error loading suggested resources when switching to Admin view:', error);
      });
      loadReportedResources().catch(error => {
        console.error('Error loading reported resources when switching to Admin view:', error);
      });
      // Load sponsorship pending count for super_admin and specialty_admin
      if (currentUser.role === 'super_admin' || currentUser.role === 'specialty_admin') {
        supabase
          .from('sponsorship_inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new')
          .then(({ count }) => setSponsorshipPendingCount(count || 0))
          .catch(() => {});
      }
    }
  }, [currentView, currentUser, loadSuggestedResources, loadReportedResources]);

  // Admin messaging: load unread count and subscribe to realtime messages
  const messagingChannelRef = useRef(null);
  useEffect(() => {
    if (!currentUser?.id || !isAdmin(currentUser)) {
      setUnreadMessageCount(0);
      return;
    }

    // Load initial unread count
    supabase
      .from('admin_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentUser.id)
      .is('read_at', null)
      .then(({ count }) => setUnreadMessageCount(count || 0))
      .catch(() => {});

    // Realtime subscription for new messages
    const channel = supabase
      .channel('app-admin-messages-' + currentUser.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setUnreadMessageCount(prev => prev + 1);
          // Show toast for new message
          const senderName = payload.new.sender_id?.substring(0, 8) || 'Someone';
          toast.info(`New message received`);
        }
      )
      .subscribe();

    messagingChannelRef.current = channel;

    return () => {
      if (messagingChannelRef.current) {
        supabase.removeChannel(messagingChannelRef.current);
        messagingChannelRef.current = null;
      }
    };
  }, [currentUser?.id, currentUser?.role, toast]);

  // NOTE: All the auth functions (checkUser, loadUserProfile, etc.) are now in useAuth hook!
  // NOTE: toggleFavorite, toggleUpcomingCase, updateNote are now from hooks!

  async function handleAddResource(resourceData, imageFile) {
    try {
      if (!imageFile) {
        toast.error('Image is required');
        return;
      }

      const processedImage = await processResourceImage(imageFile);
      const fileName = `resource-${Date.now()}.webp`;
      const filePath = `resource-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, processedImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      const insertData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type,
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
        curated_by: currentUser.id,
        is_sponsored: false
      };

      if (resourceData.category_id) {
        insertData.category_id = resourceData.category_id;
      }

      if (resourceData.type === 'video' && resourceData.duration_seconds) {
        insertData.duration_seconds = resourceData.duration_seconds;
      }

      if (resourceData.implant_info_url) {
        insertData.implant_info_url = resourceData.implant_info_url;
      }

      const { error } = await supabase
        .from('resources')
        .insert([insertData]);

      if (error) throw error;

      setShowAddForm(false);
      loadAllData();
      toast.success('Resource added successfully!');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.RESOURCE_CREATED, 'resource', null, { title: resourceData.title });
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Error adding resource: ' + error.message);
    }
  }

  async function handleSuggestResource(resourceData, imageFile) {
    try {
      if (!imageFile) {
        toast.error('Image is required');
        throw new Error('Image is required');
      }

      const processedImage = await processResourceImage(imageFile);
      const fileName = `suggestion-${Date.now()}.webp`;
      const filePath = `resource-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, processedImage);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      // Use specialty_id and subspecialty_id from formData if provided (for Podiatry mapping)
      const finalSpecialtyId = resourceData.specialty_id || currentUser.specialtyId || null;
      const finalSubspecialtyId = resourceData.subspecialty_id || currentUser.subspecialtyId || null;

      const insertData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type || RESOURCE_TYPES.VIDEO,
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
        suggested_by: currentUser.id,
        status: 'pending', // TODO: Use constant from utils/constants.js
        user_specialty_id: finalSpecialtyId,
        user_subspecialty_id: finalSubspecialtyId
      };
      
      if (resourceData.category_id) {
        insertData.category_id = resourceData.category_id;
      }

      // Include suggested category name if user suggested a new category
      if (resourceData.suggested_category_name) {
        insertData.suggested_category_name = resourceData.suggested_category_name.trim();
      }

      if (resourceData.type === RESOURCE_TYPES.VIDEO && resourceData.duration_seconds) {
        insertData.duration_seconds = resourceData.duration_seconds;
      }

      if (resourceData.implant_info_url) {
        insertData.implant_info_url = resourceData.implant_info_url;
      }

      const { error } = await supabase
        .from('resource_suggestions')
        .insert([insertData]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      setShowSuggestForm(false);
      toast.success('Resource suggestion submitted successfully! It will be reviewed by an admin.');
    } catch (error) {
      console.error('❌ Error suggesting resource:', error);
      toast.error('Error submitting suggestion: ' + error.message);
      throw error; // Re-throw so the modal knows there was an error
    }
  }

  async function handleApproveSuggestion(suggestionId) {
    try {
      const { data: suggestion, error: fetchError } = await supabase
        .from('resource_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (fetchError) throw fetchError;

      const resourceData = {
        title: suggestion.title,
        url: suggestion.url,
        description: suggestion.description,
        resource_type: suggestion.resource_type,
        image_url: suggestion.image_url,
        keywords: suggestion.keywords || null,
        category_id: suggestion.category_id || null,
        duration_seconds: suggestion.duration_seconds || null,
        implant_info_url: suggestion.implant_info_url || null,
        curated_by: currentUser.id // Security: Set the admin who approved this resource
      };

      const { error: insertError } = await supabase
        .from('resources')
        .insert([resourceData]);

      if (insertError) throw insertError;

      // Security: Validate input - suggestionId must be a valid UUID
      if (!suggestionId || typeof suggestionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suggestionId)) {
        throw new Error('Invalid suggestion ID');
      }
      
      console.log('🔵 Updating suggestion status to approved:', {
        suggestionId: suggestionId.substring(0, 8) + '...', // Security: Mask full UUID in logs
        status: 'approved'
      });
      
      const { data: updateData, error: updateError } = await supabase
        .from('resource_suggestions')
        .update({ 
          status: 'approved', 
          reviewed_by: currentUser.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', suggestionId)
        .select();

      if (updateError) {
        // Security: Sanitize error message to prevent information leakage
        const sanitizedMessage = updateError.message ? 
          updateError.message.replace(/[<>]/g, '').substring(0, 100) : 
          'Failed to update suggestion status';
        console.error('❌ Error updating suggestion status:', {
          code: updateError.code,
          status: updateError.status,
          message: sanitizedMessage
        });
        throw new Error(sanitizedMessage);
      }
      
      console.log('✅ Suggestion status updated successfully:', updateData);

      // Reload suggestions to remove approved one from the list
      await loadSuggestedResources();
      await loadAllData();
      toast.success('Resource approved and added to library!');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.SUGGESTION_APPROVED, 'resource_suggestion', suggestionId, {});
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Error approving suggestion: ' + error.message);
    }
  }

  async function handleRejectSuggestion(suggestionId) {
    try {
      // Security: Validate input - suggestionId must be a valid UUID
      if (!suggestionId || typeof suggestionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suggestionId)) {
        throw new Error('Invalid suggestion ID');
      }
      
      console.log('🔵 Updating suggestion status to rejected:', {
        suggestionId: suggestionId.substring(0, 8) + '...', // Security: Mask full UUID in logs
        status: 'rejected'
      });
      
      const { data: updateData, error } = await supabase
        .from('resource_suggestions')
        .update({ 
          status: 'rejected', 
          reviewed_by: currentUser.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', suggestionId)
        .select();

      if (error) {
        // Security: Sanitize error message to prevent information leakage
        const sanitizedMessage = error.message ? 
          error.message.replace(/[<>]/g, '').substring(0, 100) : 
          'Failed to update suggestion status';
        console.error('❌ Error updating suggestion status:', {
          code: error.code,
          status: error.status,
          message: sanitizedMessage
        });
        throw new Error(sanitizedMessage);
      }
      
      console.log('✅ Suggestion status updated successfully:', updateData);

      await loadSuggestedResources();
      toast.success('Resource suggestion rejected.');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.SUGGESTION_REJECTED, 'resource_suggestion', suggestionId, {});
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('Error rejecting suggestion: ' + error.message);
    }
  }

  async function handleUpdateSuggestion(suggestionId, updatedData) {
    try {
      // Security: Validate input - suggestionId must be a valid UUID
      if (!suggestionId || typeof suggestionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suggestionId)) {
        throw new Error('Invalid suggestion ID');
      }

      // Security: Validate updatedData object
      if (!updatedData || typeof updatedData !== 'object') {
        throw new Error('Invalid suggestion data');
      }

      // Calculate duration_seconds if video type
      let durationSeconds = updatedData.duration_seconds || null;
      if (updatedData.resource_type === 'video' && updatedData.duration_hours !== undefined) {
        const hours = parseInt(updatedData.duration_hours) || 0;
        const minutes = parseInt(updatedData.duration_minutes) || 0;
        const seconds = parseInt(updatedData.duration_seconds) || 0;
        durationSeconds = hours * 3600 + minutes * 60 + seconds;
      }

      console.log('🔵 Updating suggestion:', {
        suggestionId: suggestionId.substring(0, 8) + '...', // Security: Mask full UUID in logs
        fields: Object.keys(updatedData)
      });

      // Prepare update data - only include fields that exist in resource_suggestions table
      const updateData = {
        title: updatedData.title,
        description: updatedData.description,
        url: updatedData.url,
        resource_type: updatedData.resource_type,
        image_url: updatedData.image_url,
        keywords: updatedData.keywords || null,
        category_id: updatedData.category_id || null,
        duration_seconds: durationSeconds,
        user_specialty_id: updatedData.specialty_id || null,
        user_subspecialty_id: updatedData.subspecialty_id || null,
      };

      const { data: updateResult, error } = await supabase
        .from('resource_suggestions')
        .update(updateData)
        .eq('id', suggestionId)
        .select();

      if (error) {
        // Security: Sanitize error message to prevent information leakage
        const sanitizedMessage = error.message ? 
          error.message.replace(/[<>]/g, '').substring(0, 100) : 
          'Failed to update suggestion';
        console.error('❌ Error updating suggestion:', {
          code: error.code,
          status: error.status,
          message: sanitizedMessage
        });
        throw new Error(sanitizedMessage);
      }

      console.log('✅ Suggestion updated successfully:', updateResult);

      await loadSuggestedResources();
      toast.success('Suggestion updated successfully!');
    } catch (error) {
      console.error('Error updating suggestion:', error);
      toast.error('Error updating suggestion: ' + error.message);
      throw error; // Re-throw so modal can handle it
    }
  }

  async function handleEditResource(resourceId, resourceData, imageFile) {
    try {
      let imageUrl = resourceData.image_url;

      if (imageFile) {
        const fileName = `resource-${Date.now()}.webp`;
        const filePath = `resource-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Security: Validate input - resourceId must be a valid UUID
      if (!resourceId || typeof resourceId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
        throw new Error('Invalid resource ID');
      }

      console.log('🔵 Updating resource:', {
        resourceId: resourceId.substring(0, 8) + '...', // Security: Mask full UUID in logs
        category_id: resourceData.category_id,
        fields: Object.keys(resourceData)
      });

      const updateData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type,
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
        implant_info_url: resourceData.implant_info_url || null,
      };

      // Always include category_id if it's provided (even if null, to clear it)
      // Convert to string if it's not null to ensure proper UUID format
      if (resourceData.category_id !== undefined) {
        updateData.category_id = resourceData.category_id ? String(resourceData.category_id) : null;
        console.log('🔵 Including category_id in update:', updateData.category_id?.substring(0, 8) + '...' || 'null');
      } else {
        console.log('⚠️ category_id not provided in resourceData - keeping existing category');
        // Don't include category_id in update if not provided, to avoid clearing it
      }

      if (resourceData.type === 'video' && resourceData.duration_seconds) {
        updateData.duration_seconds = resourceData.duration_seconds;
      }
      
      console.log('🔵 Final updateData:', {
        ...updateData,
        category_id: updateData.category_id?.substring(0, 8) + '...' || 'null'
      });

      const { error, data } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', resourceId)
        .select('*, category_id'); // Explicitly select category_id to verify update

      if (error) {
        // Security: Sanitize error message to prevent information leakage
        const sanitizedMessage = error.message ? 
          error.message.replace(/[<>]/g, '').substring(0, 100) : 
          'Failed to update resource';
        console.error('❌ Error updating resource:', {
          code: error.code,
          status: error.status,
          message: sanitizedMessage,
          details: error.details,
          hint: error.hint
        });
        
        // Check for specific error types
        if (error.code === '42501' || error.status === 403) {
          console.error('❌ RLS Policy Error: Update blocked by Row Level Security policy');
          toast.error('Permission denied: Unable to update resource. Check RLS policies.');
        } else if (error.message && error.message.includes('category_id')) {
          toast.error('Error: The category_id column does not exist in the database. Please run the SQL migration "add_category_id_column.sql" in your Supabase SQL editor first.');
        } else {
          toast.error('Error updating resource: ' + sanitizedMessage);
        }
        throw error;
      }
      
      // Check if update actually affected any rows
      if (data && data.length === 0) {
        console.warn('⚠️ Update query returned no rows - this might indicate RLS is blocking the SELECT after UPDATE');
      }

      // Log update response (data might be empty array or undefined due to RLS)
      if (data && data.length > 0) {
        console.log('✅ Resource updated successfully:', {
          resourceId: resourceId.substring(0, 8) + '...',
          updatedCategoryId: data[0].category_id?.substring(0, 8) + '...' || 'null',
          fullResponse: {
            id: data[0].id?.substring(0, 8) + '...',
            title: data[0].title,
            category_id: data[0].category_id
          }
        });
        
        // Verify the category_id was actually updated
        if (updateData.category_id !== undefined && data[0].category_id !== updateData.category_id) {
          console.warn('⚠️ Category ID mismatch!', {
            expected: updateData.category_id?.substring(0, 8) + '...',
            actual: data[0].category_id?.substring(0, 8) + '...' || 'null'
          });
        }
      } else {
        console.log('✅ Resource update query completed (no data returned - may be RLS policy)');
      }

      // Always verify by querying the database directly (bypasses RLS select restrictions)
      if (updateData.category_id !== undefined) {
        try {
          const { data: verifyData, error: verifyError } = await supabase
            .from('resources')
            .select('id, category_id')
            .eq('id', resourceId)
            .single();
          
          if (verifyError) {
            console.warn('⚠️ Could not verify category update:', verifyError.message);
          } else if (verifyData) {
            console.log('🔵 Database verification:', {
              resourceId: resourceId.substring(0, 8) + '...',
              category_id_in_db: verifyData.category_id?.substring(0, 8) + '...' || 'null',
              matches_expected: verifyData.category_id === updateData.category_id
            });
            
            if (verifyData.category_id !== updateData.category_id) {
              console.error('❌ Database verification failed - category_id was not updated!', {
                expected: updateData.category_id?.substring(0, 8) + '...',
                actual_in_db: verifyData.category_id?.substring(0, 8) + '...' || 'null'
              });
              toast.error('Warning: Category update may not have persisted. Please refresh and check.');
            } else {
              console.log('✅ Category update verified in database');
            }
          }
        } catch (verifyErr) {
          console.warn('⚠️ Error during verification:', verifyErr.message);
          // Don't throw - update may have succeeded even if verification fails
        }
      }

      setEditingResource(null);
      // Reload all data to ensure UI reflects the changes
      await loadAllData();
      toast.success('Resource updated successfully!');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.RESOURCE_EDITED, 'resource', resourceId, { title: resourceData.title });
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Error updating resource: ' + error.message);
    }
  }

  async function handleDeleteResource(resourceId) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      // Security: Validate input - resourceId must be a valid UUID
      if (!resourceId || typeof resourceId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
        throw new Error('Invalid resource ID');
      }
      
      console.log('🔵 Deleting resource:', { 
        resourceId: resourceId.substring(0, 8) + '...' // Security: Mask full UUID in logs
      });
      
      // Security: Delete related records first to avoid constraint violations
      // Delete from resource_history if it exists (check by attempting delete, ignore if table doesn't exist)
      // Note: If there's a foreign key constraint violation, it might be due to a trigger
      // that tries to insert into resource_history when deleting the resource.
      // In that case, we need to delete history records first, or the database constraint
      // needs to be set to CASCADE DELETE.
      try {
        const { error: historyError } = await supabase
          .from('resource_history')
          .delete()
          .eq('resource_id', resourceId);
        
        // Ignore errors if table doesn't exist (42P01 = undefined_table)
        // Ignore foreign key violations (23503) - these might be from triggers
        // The database constraint should handle CASCADE DELETE
        if (historyError) {
          if (historyError.code === '42P01') {
            // Table doesn't exist, which is fine
            console.log('ℹ️ resource_history table does not exist, skipping...');
          } else if (historyError.code === '23503') {
            // Foreign key violation - this might be from a trigger trying to insert
            // The database constraint should handle this with CASCADE DELETE
            console.warn('⚠️ Foreign key violation when deleting resource_history (may be from trigger):', historyError.message);
          } else {
            console.warn('⚠️ Warning deleting resource_history:', historyError.message);
          }
        }
      } catch (historyErr) {
        // Table might not exist, which is fine
        console.log('ℹ️ resource_history table may not exist, continuing...');
      }
      
      // Now delete the resource itself
      // If there's a trigger that inserts into resource_history on DELETE,
      // and that trigger violates a foreign key, we need to fix the database constraint
      const { data: deleteData, error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
        .select();

      if (error) {
        // Security: Sanitize error message to prevent information leakage
        const sanitizedMessage = error.message ? 
          error.message.replace(/[<>]/g, '').substring(0, 100) : 
          'Failed to delete resource';
        console.error('❌ Error deleting resource:', {
          code: error.code,
          status: error.status,
          message: sanitizedMessage
        });
        throw new Error(sanitizedMessage);
      }

      console.log('✅ Resource deleted successfully:', deleteData);
      loadAllData();
      toast.success('Resource deleted successfully!');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.RESOURCE_DELETED, 'resource', resourceId, {});
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Error deleting resource: ' + error.message);
    }
  }

  const canInteractWithResources = () => {
    return currentUser?.userType === USER_TYPES.ATTENDING || currentUser?.userType === USER_TYPES.RESIDENT || currentUser?.userType === USER_TYPES.FELLOW;
  };

  async function reorderResources(newOrder) {
    try {
      console.log('🔵 App reorderResources called:', newOrder.length, 'resources');
      console.log('🔵 First 3 IDs:', newOrder.slice(0, 3).map(r => r.id.substring(0, 8)));
      setResources(newOrder);
      toast.success('Resources reordered successfully!');
    } catch (error) {
      console.error('Error reordering resources:', error);
      toast.error('Error reordering resources: ' + error.message);
    }
  }

  // Memoize sort function
  const sortResources = useCallback((resourcesToSort) => {
    return [...resourcesToSort].sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      
      const aFav = isFavorited(a.id);
      const bFav = isFavorited(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      return 0;
    });
  }, [isFavorited]);

  // Memoize filtered resources for performance
  // Security: When browsing a subspecialty, filter resources to only show those belonging to that subspecialty's categories
  const displayedResources = useMemo(() => {
    let filtered = resources;

    if (showFavoritesOnly) {
      filtered = filtered.filter(r => isFavorited(r.id));
    }

    // Security: Filter by subspecialty whenever user has one (or is browsing one).
    // If their subspecialty has no categories yet (e.g. Sports Medicine), show no resources.
    if (browsingSubspecialtyId !== null || currentUser?.subspecialtyId != null) {
      // Get all category IDs for the current browsing context (browsing subspecialty or user's subspecialty)
      const allowedCategoryIds = categories.map(c => c.id);
      // Also include subcategories
      const subcategoryIds = categories
        .filter(c => c.parent_category_id)
        .map(c => c.id);
      const allAllowedCategoryIds = [...allowedCategoryIds, ...subcategoryIds];

      // Filter resources to only show those with category_id in allowed categories
      // OR those with procedure_id that belongs to allowed categories
      filtered = filtered.filter(r => {
        // Check if resource has category_id in allowed categories
        if (r.category_id && allAllowedCategoryIds.includes(r.category_id)) {
          return true;
        }
        // Check if resource has procedure_id that belongs to allowed categories
        if (r.procedure_id) {
          const procedureIds = procedures
            .filter(p => allAllowedCategoryIds.includes(p.category_id))
            .map(p => p.id);
          return procedureIds.includes(r.procedure_id);
        }
        // If resource has no category_id or procedure_id, exclude it when browsing
        // (unless it's a general resource that should be visible everywhere)
        return false;
      });
    }

    // Further filter by selected category if one is selected
    if (selectedCategoryId) {
      const categoryIds = [selectedCategoryId];
      const subcategoryIds = categories
        .filter(c => c.parent_category_id === selectedCategoryId)
        .map(c => c.id);
      const allCategoryIds = [...categoryIds, ...subcategoryIds];

      filtered = filtered.filter(r => {
        if (r.category_id && allCategoryIds.includes(r.category_id)) {
          return true;
        }
        if (r.procedure_id) {
          const procedureIds = procedures
            .filter(p => allCategoryIds.includes(p.category_id))
            .map(p => p.id);
          return procedureIds.includes(r.procedure_id);
        }
        return false;
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower) ||
        r.keywords?.toLowerCase().includes(searchLower)
      );
    }

    return sortResources(filtered);
  }, [resources, showFavoritesOnly, selectedCategoryId, categories, procedures, searchTerm, browsingSubspecialtyId, currentUser?.subspecialtyId, isFavorited, sortResources]);

  // Pagination: 10 resources per page when more than 10
  const RESOURCES_PAGE_SIZE = 10;
  const [resourcesPage, setResourcesPage] = useState(1);
  const paginationTotalPages = Math.max(1, Math.ceil(displayedResources.length / RESOURCES_PAGE_SIZE));
  const paginatedResources = useMemo(
    () => displayedResources.slice((resourcesPage - 1) * RESOURCES_PAGE_SIZE, resourcesPage * RESOURCES_PAGE_SIZE),
    [displayedResources, resourcesPage]
  );
  useEffect(() => {
    setResourcesPage(1);
  }, [displayedResources]);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      endAnalyticsSession();
      await signOut();
      // useAuth hook will handle setting currentUser to null
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out. Please try again.');
    }
  };

  // Stable callbacks for main UI — MUST be defined before any early return.
  // Inline useCallback in JSX causes Error #310: we return <LoginView /> before
  // the main app, so those hooks never run; after sign-in we render main app
  // and they do → "Rendered more hooks than during the previous render."
  const handleToggleUpcomingCases = useCallback(() => setShowUpcomingCases((prev) => !prev), []);
  const handleSettingsClick = useCallback(() => setShowSettings(true), []);
  const handleToggleFavorites = useCallback(() => setShowFavoritesOnly((prev) => !prev), []);
  const handleSearchChange = useCallback(
    (term) => {
      setSearchTerm(term);
      if (term?.trim() && currentUser) trackSearchQuery(term, currentUser.id, 0);
    },
    [currentUser]
  );
  const handleSuggestResourceClick = useCallback(() => setShowSuggestForm(true), []);
  const handleCategorySelect = useCallback(
    (categoryId) => {
      // Security: Validate category ID before processing
      // Note: categories are already filtered server-side by user's subspecialty,
      // but we validate client-side as defense in depth
      const validation = validateCategoryId(categoryId, categories);
      if (!validation.valid) {
        console.error('Invalid category selection:', validation.error);
        toast.error('Invalid category selection. Please try again.');
        return;
      }
      
      setSelectedCategoryId(categoryId);
      if (categoryId && currentUser) {
        trackCategorySelection(currentUser.id, categoryId, null);
      }
    },
    [currentUser, categories, toast]
  );
  const handleAddResourceClick = useCallback(() => setShowAddForm(true), []);
  const handleEditResourceClick = useCallback((resource) => setEditingResource(resource), []);
  const handleEditCategoriesClick = useCallback(() => setShowCategoryManagement(true), []);
  const handleShowSuggestedResourcesClick = useCallback(() => setShowSuggestedResources(true), []);
  const handleShowReportedResourcesClick = useCallback(() => setShowReportedResources(true), []);
  const handleReportResource = useCallback((resource) => setResourceToReport(resource), []);
  const handleReportSuccess = useCallback(() => {
    setResourceToReport(null);
    if (isAdmin(currentUser)) loadReportedResources();
  }, [currentUser, loadReportedResources]);
  const handleDismissReport = useCallback(async (reportId) => {
    try {
      const { error } = await supabase
        .from('resource_reports')
        .update({ status: 'dismissed', reviewed_by: currentUser?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      toast.success('Report dismissed.');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.REPORT_DISMISSED, 'resource_report', reportId, {});
      await loadReportedResources();
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report.');
    }
  }, [currentUser?.id, loadReportedResources]);
  const handleMarkReviewedReport = useCallback(async (reportId) => {
    try {
      const { error } = await supabase
        .from('resource_reports')
        .update({ status: 'reviewed', reviewed_by: currentUser?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw error;
      toast.success('Report marked as reviewed.');
      logAdminAction(currentUser.id, ADMIN_ACTION_TYPES.REPORT_REVIEWED, 'resource_report', reportId, {});
      await loadReportedResources();
    } catch (error) {
      console.error('Error marking report reviewed:', error);
      toast.error('Failed to update report.');
    }
  }, [currentUser?.id, loadReportedResources]);
  const handleReturnToBrowse = useCallback(() => setCurrentView(VIEW_MODES.USER), []);
  const handleCloseCategoryManagement = useCallback(() => {
    setShowCategoryManagement(false);
    fetchCategoriesAndProceduresForUser(currentUser, browsingSubspecialtyId).then(({ categoriesData, proceduresData }) => {
      setCategories(categoriesData);
      setProcedures(proceduresData || []);
    });
  }, [currentUser, browsingSubspecialtyId, fetchCategoriesAndProceduresForUser]);

  // Load available subspecialties for browsing dropdown
  // Security: RLS policies ensure users only see subspecialties they have access to
  const loadAvailableSubspecialties = useCallback(async () => {
    try {
      // Load all subspecialties - RLS will filter based on user permissions
      const { data, error } = await supabase
        .from('subspecialties')
        .select('id, name, specialty_id, specialties!inner(name)')
        .order('name');
      
      if (error) {
        console.error('Error loading subspecialties:', error);
        setAvailableSubspecialties([]);
        return;
      }
      
      // Security: Validate each subspecialty ID format
      const validatedSubspecialties = (data || []).filter(sub => {
        const uuidValidation = validateUuid(sub.id);
        if (!uuidValidation.valid) {
          console.warn('Invalid subspecialty ID format, skipping:', sub.id?.substring(0, 8) + '...');
          return false;
        }
        return true;
      });
      
      setAvailableSubspecialties(validatedSubspecialties);
    } catch (error) {
      console.error('Error loading subspecialties:', error);
      setAvailableSubspecialties([]);
    }
  }, []);

  // Handle browsing subspecialty change
  // Security: Validates UUID format and reloads categories/resources
  const handleBrowsingSubspecialtyChange = useCallback(async (subspecialtyId) => {
    // Security: Validate UUID format
    if (subspecialtyId !== null && subspecialtyId !== '') {
      const uuidValidation = validateUuid(subspecialtyId);
      if (!uuidValidation.valid) {
        console.error('Invalid subspecialty ID format:', uuidValidation.error);
        toast.error('Invalid subspecialty selection. Please try again.');
        return;
      }
      
      // Security: Verify subspecialty exists in available list (defense in depth)
      const subspecialtyExists = availableSubspecialties.some(sub => sub.id === subspecialtyId);
      if (!subspecialtyExists) {
        console.warn('Subspecialty not found in available list:', subspecialtyId?.substring(0, 8) + '...');
        toast.error('Subspecialty not available. Please select a different one.');
        return;
      }
    }
    
    setBrowsingSubspecialtyId(subspecialtyId);
    setSelectedCategoryId(null); // Clear category selection when switching subspecialties
    
    // Reload categories and procedures for the selected subspecialty
    try {
      const { categoriesData, proceduresData } = await fetchCategoriesAndProceduresForUser(currentUser, subspecialtyId);
      setCategories(categoriesData);
      setProcedures(proceduresData);
      
      // Show all resources for this subspecialty until user picks a category
      setSelectedCategoryId(null);
    } catch (error) {
      console.error('Error loading categories for browsing subspecialty:', error);
      toast.error('Error loading resources. Please try again.');
    }
  }, [currentUser, availableSubspecialties, fetchCategoriesAndProceduresForUser, toast]);

  // Only show login screen if we have no user and loading is stuck
  // Don't timeout if we already have a user - they're logged in!
  const [forceShowLogin, setForceShowLogin] = useState(false);
  useEffect(() => {
    // If we have a user, never force login screen - they're already logged in
    if (currentUser) {
      setForceShowLogin(false);
      return;
    }
    
    // Only timeout if no user after 2 seconds (should be instant if no session)
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading timeout (2s) - showing login screen (no user found)');
        setForceShowLogin(true);
      }, 2000); // 2 seconds - should be instant if no session
      return () => clearTimeout(timeout);
    } else {
      setForceShowLogin(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // Only depend on loading - currentUser check is inside

  // Check if we're returning from OAuth (URL has hash fragments)
  const [checkingOAuth, setCheckingOAuth] = useState(false);
  useEffect(() => {
    // Check if URL has OAuth callback parameters
    const hashParams = window.location.hash;
    if (hashParams && (hashParams.includes('access_token') || hashParams.includes('code'))) {
      console.log('OAuth callback detected, waiting for session...');
      setCheckingOAuth(true);
      // Give Supabase time to process the OAuth callback
      const timeout = setTimeout(() => {
        setCheckingOAuth(false);
      }, 3000); // Wait up to 3 seconds for session
      return () => clearTimeout(timeout);
    } else {
      setCheckingOAuth(false);
    }
  }, []);

  // Show loading if checking OAuth callback or still loading (but not if we're forcing login)
  if ((loading || checkingOAuth) && !forceShowLogin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {checkingOAuth ? 'Completing sign in...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login screen if no user AND (not loading OR forceShowLogin is true)
  // Also check if currentUser exists but has no id (invalid user state)
  if ((!currentUser || !currentUser.id) && (!loading || forceShowLogin)) {
    return <LoginView onLogin={refreshSession} />;
  }

  if (showOnboarding && currentUser) {
    return (
      <div className="relative">
        {/* Sign Out button for testing - top right corner */}
        <button
          onClick={async () => {
            await signOut();
            setForceShowLogin(true);
          }}
          className="absolute top-4 right-4 z-50 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Sign out (for testing)"
        >
          Sign Out
        </button>
        <Onboarding
          user={currentUser}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  // Gate: user finished onboarding but has not accepted Terms and Conditions
  if (currentUser?.onboardingComplete && !currentUser?.termsAcceptedAt) {
    return (
      <TermsAcceptanceModal
        isOpen={true}
        onAccept={async () => {
          await updateProfile({ termsAcceptedAt: new Date().toISOString() });
          await refreshProfile();
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Header */}
        <Header
          currentUser={currentUser}
          currentView={currentView}
          onViewChange={setCurrentView}
          showUpcomingCases={showUpcomingCases}
          upcomingCasesCount={upcomingCases.length}
          onToggleUpcomingCases={handleToggleUpcomingCases}
          onSettingsClick={handleSettingsClick}
          onSignOut={handleSignOut}
        />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {currentView === VIEW_MODES.USER ? (
          <UserView
            resources={paginatedResources}
            paginationTotal={displayedResources.length}
            paginationPage={resourcesPage}
            paginationTotalPages={paginationTotalPages}
            onPaginationPrevious={() => setResourcesPage((p) => Math.max(1, p - 1))}
            onPaginationNext={() => setResourcesPage((p) => Math.min(paginationTotalPages, p + 1))}
            allResources={resources}
            upcomingCases={upcomingCases}
            showUpcomingCases={showUpcomingCases}
            onToggleUpcomingCases={handleToggleUpcomingCases}
            showFavoritesOnly={showFavoritesOnly}
            searchTerm={searchTerm}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onToggleFavorites={handleToggleFavorites}
            onSearchChange={handleSearchChange}
            onToggleFavorite={toggleFavorite}
            onToggleUpcomingCase={toggleUpcomingCase}
            onReorderUpcomingCases={reorderUpcomingCases}
            onUpdateNote={updateNote}
            onSuggestResource={handleSuggestResourceClick}
            onCategorySelect={handleCategorySelect}
            currentUser={currentUser}
            isFavorited={isFavorited}
            getNote={getNote}
            availableSubspecialties={availableSubspecialties}
            browsingSubspecialtyId={browsingSubspecialtyId}
            onBrowsingSubspecialtyChange={handleBrowsingSubspecialtyChange}
            isInUpcomingCases={isInUpcomingCases}
            onReportResource={handleReportResource}
          />
        ) : currentView === VIEW_MODES.ADMIN && isAdmin(currentUser) ? (
          <AdminView
            resources={resources}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            onAddResource={handleAddResourceClick}
            onEditResource={handleEditResourceClick}
            onDeleteResource={handleDeleteResource}
            onEditCategories={handleEditCategoriesClick}
            onReorderResources={reorderResources}
            currentUser={currentUser}
            suggestedResources={suggestedResources || []}
            onShowSuggestedResources={handleShowSuggestedResourcesClick}
            reportedResources={reportedResources || []}
            onShowReportedResources={handleShowReportedResourcesClick}
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onDismissReport={handleDismissReport}
            onMarkReviewedReport={handleMarkReviewedReport}
            sponsorshipPendingCount={sponsorshipPendingCount}
            unreadMessageCount={unreadMessageCount}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            availableSubspecialties={availableSubspecialties}
          />
        ) : currentView === VIEW_MODES.REP && currentUser?.isRep ? (
          <RepView currentUser={currentUser} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to access this mode.</p>
            <button
              onClick={handleReturnToBrowse}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Return to Browse
            </button>
          </div>
        )}

        {/* Legal Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <nav className="flex flex-wrap justify-center gap-x-1 gap-y-1 text-sm mb-2">
              <button type="button" onClick={() => setLegalPage('terms')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Terms</button>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
              <button type="button" onClick={() => setLegalPage('privacy')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Privacy</button>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
              <button type="button" onClick={() => setLegalPage('copyright')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Copyright</button>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
              <button type="button" onClick={() => setLegalPage('sponsorship')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Sponsorship</button>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
              <button type="button" onClick={() => setLegalPage('about')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">About</button>
              <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">•</span>
              <button type="button" onClick={() => setLegalPage('contact')} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Contact</button>
              {currentUser && (
                <>
                  <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">&bull;</span>
                  <button type="button" onClick={() => setShowSponsorshipInquiry(true)} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Partnership Inquiries</button>
                </>
              )}
            </nav>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
              © 2026 TWH Systems, LLC.
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
              These resources are for educational purposes only and do not constitute medical advice or recommendations. Clinical decisions remain the provider's responsibility.
            </p>
          </div>
        </footer>
      </main>

      {/* Legal pages modal */}
      {legalPage && (
        <LegalModal
          page={legalPage}
          onClose={() => setLegalPage(null)}
        />
      )}

      {/* Modals */}
      {showAddForm && (
        <AddResourceModal
          currentUser={currentUser}
          onSubmit={handleAddResource}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {showSuggestForm && (
        <SuggestResourceModal
          currentUser={currentUser}
          onSubmit={handleSuggestResource}
          onClose={() => setShowSuggestForm(false)}
        />
      )}

      {editingResource && (
        <EditResourceModal
          resource={editingResource}
          currentUser={currentUser}
          onSubmit={(resourceData, imageFile) => handleEditResource(editingResource.id, resourceData, imageFile)}
          onClose={() => setEditingResource(null)}
        />
      )}

      {showSuggestedResources && (
        <SuggestedResourcesModal
          suggestions={suggestedResources}
          onApprove={handleApproveSuggestion}
          onReject={handleRejectSuggestion}
          onUpdate={handleUpdateSuggestion}
          onClose={() => setShowSuggestedResources(false)}
          currentUser={currentUser}
        />
      )}

      {resourceToReport && (
        <ReportResourceModal
          resource={resourceToReport}
          onClose={() => setResourceToReport(null)}
          onSuccess={handleReportSuccess}
          currentUser={currentUser}
        />
      )}

      {showReportedResources && (
        <ReportedResourcesModal
          reports={reportedResources}
          onDismiss={handleDismissReport}
          onMarkReviewed={handleMarkReviewedReport}
          onEditResource={handleEditResourceClick}
          onDeleteResource={handleDeleteResource}
          onClose={() => setShowReportedResources(false)}
          currentUser={currentUser}
        />
      )}

      {showCategoryManagement && (
        <CategoryManagementModal
          currentUser={currentUser}
          onClose={handleCloseCategoryManagement}
        />
      )}

      <SponsorshipInquiryModal
        isOpen={showSponsorshipInquiry}
        onClose={() => setShowSponsorshipInquiry(false)}
        currentUser={currentUser}
      />

      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          darkMode={darkMode}
          onDarkModeToggle={(enabled) => {
            console.log('Dark mode toggle called with:', enabled);
            setDarkMode(enabled);
            localStorage.setItem('darkMode', enabled.toString());
            // The useEffect will handle the classList update, but we can also do it immediately
            if (enabled) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }}
          onUpdateProfile={async (updates) => {
            // Transform to match updateProfile signature
            const result = await updateProfile({
              specialtyId: updates.specialtyId,
              subspecialtyId: updates.subspecialtyId,
            });
            return result;
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}

export default SurgicalTechniquesApp;
