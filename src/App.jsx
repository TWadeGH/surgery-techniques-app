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
import { VIEW_MODES, USER_TYPES, ADMIN_TABS, RESOURCE_TYPES } from './utils/constants';

// Import components
import Header from './components/layout/Header';
import ResourceFilters from './components/resources/ResourceFilters';
import ResourceList from './components/resources/ResourceList';
import ResourceCard from './components/resources/Resourcecard';
import { SuggestResourceModal } from './components/resources';
import { LoginView, UserView } from './components/views';
import { ErrorBoundary, SettingsModal, useToast, ConfirmDialog } from './components/common';
import { SuggestedResourcesModal, CategoryManagementModal, EditResourceModal, AddResourceModal, AdminView } from './components/admin';

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
  
  // Resources (will be integrated after categories work)
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Favorites (replaces ~300 lines)
  const { 
    isFavorited, 
    toggleFavorite
  } = useFavorites(currentUser?.id);
  
  // Notes with auto-save (replaces ~400 lines)
  const { 
    getNote, 
    updateNote
  } = useNotes(currentUser?.id);
  
  // Upcoming Cases (replaces ~500 lines)
  const { 
    upcomingCases,
    toggleCase: toggleUpcomingCase,
    reorderCases: reorderUpcomingCases,
    isInUpcomingCases
  } = useUpcomingCases(currentUser?.id);
  
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
  }, [currentUser]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    // The useAuth hook will automatically reload the profile
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
  }, [currentUser]);

  const loadAllData = useCallback(async () => {
    try {
      // Load resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      setResources(resourcesData || []);

      // Load categories for user's subspecialty
      if (currentUser?.subspecialtyId) {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('subspecialty_id', currentUser.subspecialtyId)
          .order('order');

        if (categoriesData) {
          setCategories(categoriesData);
        }

        // Load all procedures for filtering
        const { data: proceduresData } = await supabase
          .from('procedures')
          .select('*')
          .in('category_id', categoriesData?.map(c => c.id) || []);

        if (proceduresData) {
          setProcedures(proceduresData);
        }
      }

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
  }, [currentUser, loadSuggestedResources]);

  // Load data when user is authenticated (moved after loadAllData definition)
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser, loadAllData]);

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

  // REMOVED: toggleFavorite - now from useFavorites hook
  // REMOVED: toggleUpcomingCase - now from useUpcomingCases hook  
  // REMOVED: reorderUpcomingCases - now from useUpcomingCases hook
  // REMOVED: updateNote - now from useNotes hook

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

  // Show loading only briefly (max 3 seconds)
  if (loading && !forceShowLogin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if no user (fast path)
  if (!currentUser) {
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
          onToggleUpcomingCases={useCallback(() => {
            setShowUpcomingCases(prev => !prev);
          }, [])}
          onSettingsClick={useCallback(() => {
            setShowSettings(true);
          }, [])}
          onSignOut={handleSignOut}
        />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {currentView === VIEW_MODES.USER ? (
          <UserView 
            resources={displayedResources}
            upcomingCases={upcomingCases}
            showUpcomingCases={showUpcomingCases}
            onToggleUpcomingCases={useCallback(() => {
              setShowUpcomingCases(prev => !prev);
            }, [])}
            showFavoritesOnly={showFavoritesOnly}
            searchTerm={searchTerm}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onToggleFavorites={useCallback(() => {
              setShowFavoritesOnly(prev => !prev);
            }, [])}
            onSearchChange={useCallback((term) => {
              setSearchTerm(term);
              if (term && term.trim().length > 0 && currentUser) {
                // Note: displayedResources is memoized, so we'll track after state update
                // For now, we'll track with the search term
                trackSearchQuery(term, currentUser.id, 0);
              }
            }, [currentUser])}
            onToggleFavorite={toggleFavorite}
            onToggleUpcomingCase={toggleUpcomingCase}
            onReorderUpcomingCases={reorderUpcomingCases}
            onUpdateNote={updateNote}
            onSuggestResource={useCallback(() => {
              setShowSuggestForm(true);
            }, [])}
            onCategorySelect={useCallback((categoryId) => {
              setSelectedCategoryId(categoryId);
              if (categoryId && currentUser) {
                const category = categories.find(c => c.id === categoryId);
                trackCategorySelection(currentUser.id, categoryId, null);
              }
            }, [currentUser, categories])}
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
            onAddResource={useCallback(() => setShowAddForm(true), [])}
            onEditResource={useCallback((resource) => setEditingResource(resource), [])}
            onDeleteResource={handleDeleteResource}
            onEditCategories={useCallback(() => {
              setShowCategoryManagement(true);
            }, [])}
            onReorderResources={reorderResources}
            currentUser={currentUser}
            suggestedResources={suggestedResources || []}
            onShowSuggestedResources={useCallback(() => {
              setShowSuggestedResources(true);
            }, [])}
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to access admin mode.</p>
            <button
              onClick={() => setCurrentView(VIEW_MODES.USER)}
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
          onClose={() => {
            setShowCategoryManagement(false);
            if (currentUser?.subspecialtyId) {
              supabase
                .from('categories')
                .select('*')
                .eq('subspecialty_id', currentUser.subspecialtyId)
                .order('order')
                .then(({ data }) => {
                  if (data) {
                    setCategories(data);
                    supabase
                      .from('procedures')
                      .select('*')
                      .in('category_id', data.map(c => c.id))
                      .then(({ data: proceduresData }) => {
                        if (proceduresData) {
                          setProcedures(proceduresData);
                        }
                      });
                  }
                });
            }
          }}
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
