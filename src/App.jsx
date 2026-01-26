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
import OnboardingFlow from './OnboardingFlow';

// Import custom hooks
import { 
  useAuth, 
  useResources, 
  useFavorites, 
  useNotes, 
  useUpcomingCases 
} from './hooks';

// Import utilities
import { isAdmin, canRateOrFavorite, isSurgeon } from './utils/helpers';
import { VIEW_MODES, USER_TYPES, ADMIN_TABS, RESOURCE_TYPES, SPECIALTY_SUBSPECIALTY } from './utils/constants';

// Import components
import Header from './components/layout/Header';
import ResourceFilters from './components/resources/ResourceFilters';
import ResourceList from './components/resources/ResourceList';
import ResourceCard from './components/resources/Resourcecard';
import { SuggestResourceModal } from './components/resources';
import { LoginView, UserView } from './components/views';
import { ErrorBoundary, useToast, ConfirmDialog } from './components/common';

// Admin Components
import { AdminView } from './components/admin';

// Modal Components
import {
  AddResourceModal,
  EditResourceModal,
  CategoryManagementModal,
  SuggestedResourcesModal,
  SettingsModal
} from './components/modals';

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
    signOut
  } = useAuth();
  
  // Use authLoading as the main loading state
  const loading = authLoading;
  
  // Stabilize userId to prevent hook re-initialization on every currentUser change
  const userId = useMemo(() => currentUser?.id, [currentUser?.id]);

  // Resources (will be integrated after categories work)
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Favorites, Notes, Upcoming Cases
  const { isFavorited, toggleFavorite } = useFavorites(userId);
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
  const [currentView, setCurrentView] = useState(VIEW_MODES.USER);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true';
    }
    return false;
  });
  const [adminTab, setAdminTab] = useState('resources');
  const [suggestedResources, setSuggestedResources] = useState([]);
  const [showSuggestedResources, setShowSuggestedResources] = useState(false);
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

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Check onboarding status
  useEffect(() => {
    if (currentUser && !currentUser.onboardingComplete) {
      setShowOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.onboardingComplete]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    // The useAuth hook will automatically reload the profile
  }, []);

  /** Generalist → all categories; Podiatry (no subspecialty) → Foot and Ankle; else → user's subspecialty. */
  const fetchCategoriesAndProceduresForUser = useCallback(async (user) => {
    let loadAll = false;
    let effectiveSubspecialtyId = user?.subspecialtyId ?? null;

    if (user?.subspecialtyId) {
      const { data: sub } = await supabase
        .from('subspecialties')
        .select('name')
        .eq('id', user.subspecialtyId)
        .maybeSingle();
      const name = (sub?.name || '').toLowerCase();
      if (name === SPECIALTY_SUBSPECIALTY.GENERALIST) {
        loadAll = true;
        effectiveSubspecialtyId = null;
      }
    } else if (user?.specialtyId) {
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
    } else {
      loadAll = true;
    }

    let categoriesData = [];
    if (loadAll) {
      const { data } = await supabase.from('categories').select('*').order('order');
      categoriesData = data || [];
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
    try {
      if (!isAdmin(currentUser)) return;

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
      } else if (currentUser.role === 'specialty_admin' && currentUser.specialtyId) {
        query = query.eq('user_specialty_id', currentUser.specialtyId);
      } else if (currentUser.role === 'subspecialty_admin' && currentUser.subspecialtyId) {
        query = query.eq('user_subspecialty_id', currentUser.subspecialtyId);
      }

      const { data, error } = await query;

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

  const loadAllData = useCallback(async () => {
    try {
      // Load resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      setResources(resourcesData || []);

      const { categoriesData, proceduresData } = await fetchCategoriesAndProceduresForUser(currentUser);
      setCategories(categoriesData);
      setProcedures(proceduresData);

      // Load suggested resources if user is an admin
      if (isAdmin(currentUser)) {
        try {
          await loadSuggestedResources();
        } catch (suggestionError) {
          console.error('Error loading suggested resources (non-blocking):', suggestionError);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.subspecialtyId, currentUser?.specialtyId, currentUser?.role, fetchCategoriesAndProceduresForUser]);

  // Load data when user is authenticated (moved after loadAllData definition)
  // Use ref to prevent multiple loads
  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (currentUser && !dataLoadedRef.current) {
      dataLoadedRef.current = true;
      loadAllData();
    } else if (!currentUser) {
      dataLoadedRef.current = false; // Reset when user logs out
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only depend on user ID, not the whole object

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
      
      const { error } = await supabase
        .from('resources')
        .insert([insertData]);

      if (error) throw error;

      setShowAddForm(false);
      loadAllData();
      toast.success('Resource added successfully!');
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

      const insertData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type || RESOURCE_TYPES.VIDEO,
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
        suggested_by: currentUser.id,
        status: 'pending', // TODO: Use constant from utils/constants.js
        user_specialty_id: currentUser.specialtyId || null,
        user_subspecialty_id: currentUser.subspecialtyId || null
      };
      
      if (resourceData.category_id) {
        insertData.category_id = resourceData.category_id;
      }
      
      if (resourceData.type === RESOURCE_TYPES.VIDEO && resourceData.duration_seconds) {
        insertData.duration_seconds = resourceData.duration_seconds;
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
        duration_seconds: suggestion.duration_seconds || null
      };

      const { error: insertError } = await supabase
        .from('resources')
        .insert([resourceData]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('resource_suggestions')
        .update({ 
          status: 'approved', 
          reviewed_by: currentUser.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', suggestionId);

      if (updateError) throw updateError;

      await loadAllData();
      toast.success('Resource approved and added to library!');
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Error approving suggestion: ' + error.message);
    }
  }

  async function handleRejectSuggestion(suggestionId) {
    try {
      const { error } = await supabase
        .from('resource_suggestions')
        .update({ 
          status: 'rejected', 
          reviewed_by: currentUser.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', suggestionId);

      if (error) throw error;

      await loadSuggestedResources();
      toast.success('Resource suggestion rejected.');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('Error rejecting suggestion: ' + error.message);
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

      const updateData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type,
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
      };
      
      if (resourceData.category_id !== undefined) {
        updateData.category_id = resourceData.category_id;
      }
      
      if (resourceData.type === 'video' && resourceData.duration_seconds) {
        updateData.duration_seconds = resourceData.duration_seconds;
      }
      
      const { error, data } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', resourceId)
        .select();

      if (error) {
        console.error('Error updating resource:', error);
        if (error.message && error.message.includes('category_id')) {
          toast.error('Error: The category_id column does not exist in the database. Please run the SQL migration "add_category_id_column.sql" in your Supabase SQL editor first.');
        }
        throw error;
      }

      setEditingResource(null);
      loadAllData();
      toast.success('Resource updated successfully!');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Error updating resource: ' + error.message);
    }
  }

  async function handleDeleteResource(resourceId) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;

      loadAllData();
      alert('Resource deleted successfully!');
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Error deleting resource: ' + error.message);
    }
  }

  const canInteractWithResources = () => {
    return currentUser?.userType === USER_TYPES.ATTENDING || currentUser?.userType === USER_TYPES.RESIDENT || currentUser?.userType === USER_TYPES.FELLOW;
  };

  async function reorderResources(newOrder) {
    try {
      setResources(newOrder);
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
  const displayedResources = useMemo(() => {
    let filtered = resources;

    if (showFavoritesOnly) {
      filtered = filtered.filter(r => isFavorited(r.id));
    }

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
  }, [resources, showFavoritesOnly, selectedCategoryId, categories, procedures, searchTerm, isFavorited, sortResources]);

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
      setSelectedCategoryId(categoryId);
      if (categoryId && currentUser) {
        trackCategorySelection(currentUser.id, categoryId, null);
      }
    },
    [currentUser, categories]
  );
  const handleAddResourceClick = useCallback(() => setShowAddForm(true), []);
  const handleEditResourceClick = useCallback((resource) => setEditingResource(resource), []);
  const handleEditCategoriesClick = useCallback(() => setShowCategoryManagement(true), []);
  const handleShowSuggestedResourcesClick = useCallback(() => setShowSuggestedResources(true), []);
  const handleReturnToBrowse = useCallback(() => setCurrentView(VIEW_MODES.USER), []);
  const handleCloseCategoryManagement = useCallback(() => {
    setShowCategoryManagement(false);
    fetchCategoriesAndProceduresForUser(currentUser).then(({ categoriesData, proceduresData }) => {
      setCategories(categoriesData);
      setProcedures(proceduresData || []);
    });
  }, [currentUser, fetchCategoriesAndProceduresForUser]);

  // Only show login screen if we have no user and loading is stuck
  // Don't timeout if we already have a user - they're logged in!
  const [forceShowLogin, setForceShowLogin] = useState(false);
  useEffect(() => {
    // If we have a user, never force login screen - they're already logged in
    if (currentUser) {
      setForceShowLogin(false);
      return;
    }
    
    // Only timeout if no user after 10 seconds
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('Loading timeout (10s) - showing login screen (no user found)');
        setForceShowLogin(true);
      }, 10000); // 10 seconds - only if no user found
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

  // Show loading if checking OAuth callback or still loading
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

  // Show login screen if no user AND not loading (prevents unmount during profile load)
  if (!currentUser && !loading) {
    return <LoginView onLogin={() => {}} />;
  }

  if (showOnboarding && currentUser) {
    return (
      <OnboardingFlow
        user={currentUser}
        onComplete={handleOnboardingComplete}
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
            resources={displayedResources}
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
            isInUpcomingCases={isInUpcomingCases}
          />
        ) : isAdmin(currentUser) ? (
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
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to access admin mode.</p>
            <button
              onClick={handleReturnToBrowse}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Return to Browse
            </button>
          </div>
        )}
      </main>

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
          onClose={() => setShowSuggestedResources(false)}
          currentUser={currentUser}
        />
      )}

      {showCategoryManagement && (
        <CategoryManagementModal
          currentUser={currentUser}
          onClose={handleCloseCategoryManagement}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUser={currentUser}
          darkMode={darkMode}
          onDarkModeToggle={(enabled) => {
            setDarkMode(enabled);
            localStorage.setItem('darkMode', enabled.toString());
            if (enabled) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }}
          onUpdateProfile={updateProfile}
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
