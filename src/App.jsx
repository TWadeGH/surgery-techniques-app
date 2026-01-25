import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Video, FileText, Link, Plus, Star, Heart, Edit, Trash2, StickyNote, ArrowRight, Sparkles, LogOut, Upload, X, Search, BarChart3, TrendingUp, GripVertical, Settings, Moon, Sun } from 'lucide-react';
import { supabase } from './lib/supabase';
import { 
  trackResourceCoview,
  trackSearchQuery,
  trackCategorySelection,
  trackRatingEvent,
  endAnalyticsSession 
} from './lib/analytics';
import { processResourceImage, createImagePreview, validateImageFile } from './lib/imageUtils';
import OnboardingFlow from './OnboardingFlow';

// Import custom hooks - THIS IS NEW!
import { 
  useAuth, 
  useResources, 
  useFavorites, 
  useNotes, 
  useUpcomingCases 
} from './hooks';

// Helper function to check if user is an admin
function isAdmin(user) {
  if (!user || !user.role) return false;
  const adminRoles = ['super_admin', 'specialty_admin', 'subspecialty_admin', 'admin'];
  return adminRoles.includes(user.role);
}

function SurgicalTechniquesApp() {
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
  
  // Stabilize user ID to prevent hook re-initialization on every currentUser change
  const userId = useMemo(() => currentUser?.id, [currentUser?.id]);
  
  // Resources (will be integrated after categories work)
  const [resources, setResources] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Favorites (replaces ~300 lines)
  const { 
    isFavorited, 
    toggleFavorite
  } = useFavorites(userId);
  
  // Notes with auto-save (replaces ~400 lines)
  const { 
    getNote, 
    updateNote
  } = useNotes(userId);
  
  // Upcoming Cases (replaces ~500 lines)
  const { 
    upcomingCases,
    toggleCase: toggleUpcomingCase,
    reorderCases: reorderUpcomingCases,
    isInUpcomingCases
  } = useUpcomingCases(userId);
  
  // ========================================
  // LOCAL STATE (Non-hook state)
  // ========================================
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentView, setCurrentView] = useState('user');
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

  // Load data when user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Check onboarding status
  useEffect(() => {
    if (currentUser && !currentUser.onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [currentUser]);

  async function handleOnboardingComplete() {
    setShowOnboarding(false);
    // The useAuth hook will automatically reload the profile
  }

  async function loadAllData() {
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
  }

  // NOTE: All the auth functions (checkUser, loadUserProfile, etc.) are now in useAuth hook!
  // NOTE: toggleFavorite, toggleUpcomingCase, updateNote are now from hooks!

  async function handleAddResource(resourceData, imageFile) {
    try {
      if (!imageFile) {
        alert('Image is required');
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
      alert('Resource added successfully!');
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('Error adding resource: ' + error.message);
    }
  }

  async function loadSuggestedResources() {
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
  }

  async function handleSuggestResource(resourceData, imageFile) {
    try {
      console.log('🚀 Starting resource suggestion...');
      console.log('resourceData:', resourceData);
      console.log('imageFile:', imageFile);
      
      if (!imageFile) {
        alert('Image is required');
        throw new Error('Image is required');
      }

      console.log('📸 Processing image...');
      const processedImage = await processResourceImage(imageFile);
      const fileName = `suggestion-${Date.now()}.webp`;
      const filePath = `resource-images/${fileName}`;

      console.log('☁️ Uploading to storage...');
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, processedImage);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('🔗 Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      const insertData = {
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description,
        resource_type: resourceData.type || 'video',
        image_url: imageUrl,
        keywords: resourceData.keywords || null,
        suggested_by: currentUser.id,
        status: 'pending',
        user_specialty_id: currentUser.specialtyId || null,
        user_subspecialty_id: currentUser.subspecialtyId || null
      };
      
      if (resourceData.category_id) {
        insertData.category_id = resourceData.category_id;
      }
      
      if (resourceData.type === 'video' && resourceData.duration_seconds) {
        insertData.duration_seconds = resourceData.duration_seconds;
      }
      
      console.log('💾 Inserting into database...');
      console.log('insertData:', insertData);
      
      const { error } = await supabase
        .from('resource_suggestions')
        .insert([insertData]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('✅ Suggestion submitted successfully!');
      setShowSuggestForm(false);
      alert('Resource suggestion submitted successfully! It will be reviewed by an admin.');
    } catch (error) {
      console.error('❌ Error suggesting resource:', error);
      alert('Error submitting suggestion: ' + error.message);
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
      alert('Resource approved and added to library!');
    } catch (error) {
      console.error('Error approving suggestion:', error);
      alert('Error approving suggestion: ' + error.message);
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
      alert('Resource suggestion rejected.');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      alert('Error rejecting suggestion: ' + error.message);
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
      
      console.log('Updating resource with data:', updateData);
      console.log('Category ID being saved:', updateData.category_id);
      
      const { error, data } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', resourceId)
        .select();

      if (error) {
        console.error('Error updating resource:', error);
        if (error.message && error.message.includes('category_id')) {
          alert('Error: The category_id column does not exist in the database. Please run the SQL migration "add_category_id_column.sql" in your Supabase SQL editor first.');
        }
        throw error;
      }
      
      console.log('Resource updated successfully:', data);
      console.log('Updated resource category_id:', data?.[0]?.category_id);

      setEditingResource(null);
      loadAllData();
      alert('Resource updated successfully!');
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('Error updating resource: ' + error.message);
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
    return currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee';
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
      alert('Error reordering resources: ' + error.message);
    }
  }

  const sortResources = (resources) => {
    return [...resources].sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      
      const aFav = isFavorited(a.id);
      const bFav = isFavorited(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      return 0;
    });
  };

  const getFilteredResources = () => {
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
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.keywords?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return sortResources(filtered);
  };

  const displayedResources = getFilteredResources();

  // Sign out handler
  const handleSignOut = async () => {
    try {
      endAnalyticsSession();
      await signOut();
      // useAuth hook will handle setting currentUser to null
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding && currentUser) {
    return (
      <OnboardingFlow 
        user={currentUser} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Surgical Techniques</h1>
              <p className="text-purple-200 text-xs sm:text-sm mono">Educational Resource Hub</p>
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
              <span className="text-white text-xs sm:text-sm">{currentUser.email}</span>
              
              {isAdmin(currentUser) && currentView === 'user' && (
                <div className="flex gap-2 glass-dark rounded-full p-1">
                  <button
                    onClick={() => setCurrentView('user')}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium bg-white text-purple-900 shadow-lg text-sm sm:text-base"
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium text-white hover:bg-white/10 transition-all text-sm sm:text-base"
                  >
                    Admin
                  </button>
                </div>
              )}

              {isAdmin(currentUser) && currentView === 'admin' && (
                <div className="flex gap-2 glass-dark rounded-full p-1">
                  <button
                    onClick={() => setCurrentView('user')}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium text-white hover:bg-white/10 transition-all text-sm sm:text-base"
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium bg-white text-purple-900 shadow-lg text-sm sm:text-base"
                  >
                    Admin
                  </button>
                </div>
              )}

              {currentView === 'user' && (currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
                <button
                  onClick={() => setShowUpcomingCases(!showUpcomingCases)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                    showUpcomingCases 
                      ? 'bg-white text-purple-900 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Plus size={18} />
                  Upcoming Cases
                  {upcomingCases.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {upcomingCases.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {currentView === 'user' ? (
          <UserView 
            resources={displayedResources}
            upcomingCases={upcomingCases}
            showUpcomingCases={showUpcomingCases}
            onToggleUpcomingCases={() => setShowUpcomingCases(!showUpcomingCases)}
            showFavoritesOnly={showFavoritesOnly}
            searchTerm={searchTerm}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onSearchChange={(term) => {
              setSearchTerm(term);
              if (term && term.trim().length > 0 && currentUser) {
                const resultCount = getFilteredResources().length;
                trackSearchQuery(term, currentUser.id, resultCount);
              }
            }}
            onToggleFavorite={toggleFavorite}
            onToggleUpcomingCase={toggleUpcomingCase}
            onReorderUpcomingCases={reorderUpcomingCases}
            onUpdateNote={updateNote}
            onSuggestResource={() => setShowSuggestForm(true)}
            onCategorySelect={(categoryId) => {
              setSelectedCategoryId(categoryId);
              if (categoryId && currentUser) {
                const category = categories.find(c => c.id === categoryId);
                trackCategorySelection(currentUser.id, categoryId, null);
              }
            }}
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
            onAddResource={() => setShowAddForm(true)}
            onEditResource={(resource) => setEditingResource(resource)}
            onDeleteResource={handleDeleteResource}
            onEditCategories={() => setShowCategoryManagement(true)}
            onReorderResources={reorderResources}
            currentUser={currentUser}
            suggestedResources={suggestedResources || []}
            onShowSuggestedResources={() => setShowSuggestedResources(true)}
            onApproveSuggestion={handleApproveSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to access admin mode.</p>
            <button
              onClick={() => setCurrentView('user')}
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
    </div>
  );
}
function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      onLogin();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setResetLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      
      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setResetLoading(false);
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Enter your email to receive a password reset link</p>

          {resetSuccess ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm mb-4">
              <p className="font-semibold mb-1">✅ Check your email!</p>
              <p>We've sent you a password reset link. Please check your inbox and spam folder.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="your@email.com"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setResetEmail('');
                }}
                className="w-full px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Surgical Techniques</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">Sign in to access the resource library</p>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full px-6 py-3 mb-6 bg-white border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserView({ resources, upcomingCases, showUpcomingCases, onToggleUpcomingCases, showFavoritesOnly, searchTerm, categories, selectedCategoryId, onToggleFavorites, onSearchChange, onToggleFavorite, onToggleUpcomingCase, onReorderUpcomingCases, onUpdateNote, onSuggestResource, onCategorySelect, currentUser, isFavorited, getNote, isInUpcomingCases }) {
  // Organize categories hierarchically
  const organizedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const topLevel = categories.filter(c => !c.parent_category_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    return topLevel.map(cat => ({
      ...cat,
      subcategories: categories
        .filter(sc => sc.parent_category_id === cat.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
  }, [categories]);

  const [expandedCategories, setExpandedCategories] = useState({});
  const [draggedUpcomingCaseId, setDraggedUpcomingCaseId] = useState(null);

  // Get resources for upcoming cases (ordered)
  const upcomingCaseResources = useMemo(() => {
    if (!showUpcomingCases || !upcomingCases.length) return [];
    const sortedCases = [...upcomingCases].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return sortedCases.map(uc => {
      const resource = resources.find(r => r.id === uc.resource_id);
      return resource ? { ...resource, upcomingCaseId: uc.id } : null;
    }).filter(Boolean);
  }, [showUpcomingCases, upcomingCases, resources]);

  // Handle drag and drop for upcoming cases
  const handleUpcomingCaseDragStart = (e, caseId) => {
    setDraggedUpcomingCaseId(caseId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleUpcomingCaseDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleUpcomingCaseDrop = (e, targetCaseId) => {
    e.preventDefault();
    if (!draggedUpcomingCaseId || draggedUpcomingCaseId === targetCaseId) return;

    const newOrder = [...upcomingCases];
    const draggedIndex = newOrder.findIndex(uc => uc.id === draggedUpcomingCaseId);
    const targetIndex = newOrder.findIndex(uc => uc.id === targetCaseId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    onReorderUpcomingCases(newOrder);
    setDraggedUpcomingCaseId(null);
  };

  // Show upcoming cases view if toggled
  if (showUpcomingCases) {
  return (
    <div className="animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Upcoming Cases</h2>
            <p className="text-gray-600 text-sm sm:text-base">Drag and drop to reorder your resources</p>
        </div>
          <button
            onClick={onToggleUpcomingCases}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all glass border hover:border-purple-300 text-purple-700 hover:bg-purple-50 text-sm sm:text-base"
          >
            Back to Browse
          </button>
        </div>

        {upcomingCaseResources.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-2">No upcoming cases yet</p>
            <p className="text-gray-400 text-sm">Add resources to your upcoming cases by clicking "+ upcoming case" on any resource</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {upcomingCaseResources.map((resource, index) => (
              <div
                key={resource.id}
                draggable
                onDragStart={(e) => handleUpcomingCaseDragStart(e, resource.upcomingCaseId)}
                onDragOver={handleUpcomingCaseDragOver}
                onDrop={(e) => handleUpcomingCaseDrop(e, resource.upcomingCaseId)}
                className={`bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all cursor-move ${
                  draggedUpcomingCaseId === resource.upcomingCaseId ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <GripVertical className="text-gray-400 mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing" size={20} />
                  <div className="flex-1 min-w-0">
                    <ResourceCard
                      resource={resource}
                      isFavorited={isFavorited(resource.id)}
                      note={getNote(resource.id) || ''}
                      onToggleFavorite={onToggleFavorite}
                      onUpdateNote={onUpdateNote}
                      onToggleUpcomingCase={onToggleUpcomingCase}
                      isUpcomingCase={true}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Resource Library</h2>
          <p className="text-gray-600 text-sm sm:text-base">Curated surgical techniques and educational materials</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onSuggestResource}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all glass border hover:border-purple-300 text-purple-700 hover:bg-purple-50 text-sm sm:text-base"
          >
            <Plus size={18} />
            <span>Suggest Resource</span>
          </button>
        {(currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
          <button
            onClick={onToggleFavorites}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
              showFavoritesOnly 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' 
                : 'glass border hover:border-purple-300'
            }`}
          >
              <Heart size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            <span>{showFavoritesOnly ? 'All Resources' : 'Favorites'}</span>
          </button>
        )}
        </div>
      </div>

      {/* Two-column layout: Categories on left, Search & Resources on right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Categories */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="glass rounded-2xl p-4 shadow-lg lg:sticky lg:top-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
            {organizedCategories.length === 0 ? (
              <p className="text-sm text-gray-500">No categories available</p>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => onCategorySelect(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategoryId === null
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Categories
                </button>
                {organizedCategories.map(category => (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => onCategorySelect(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        selectedCategoryId === category.id
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{category.name}</span>
                      {category.subcategories && category.subcategories.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories({
                              ...expandedCategories,
                              [category.id]: !expandedCategories[category.id]
                            });
                          }}
                          className="text-xs"
                        >
                          {expandedCategories[category.id] ? '▼' : '▶'}
                        </button>
                      )}
                    </button>
                    {expandedCategories[category.id] && category.subcategories && category.subcategories.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {category.subcategories.map(subcategory => (
                          <button
                            key={subcategory.id}
                            onClick={() => onCategorySelect(subcategory.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                              selectedCategoryId === subcategory.id
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            └─ {subcategory.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Search & Resources */}
        <div className="flex-1 min-w-0">
      {/* Search */}
      <div className="glass rounded-2xl p-6 mb-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Resources List */}
      <div className="space-y-4">
        {resources.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <FileText size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {showFavoritesOnly ? 'No favorites yet' : 'No resources found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {showFavoritesOnly 
                  ? 'Heart some resources to see them here!' 
                  : 'Try adjusting your search or check back later!'}
              </p>
            </div>
          </div>
        ) : (
          resources.map((resource, index) => (
            <ResourceCard 
              key={resource.id} 
              resource={resource}
              isFavorited={isFavorited(resource.id)}
              note={getNote(resource.id)}
              onToggleFavorite={onToggleFavorite}
              onUpdateNote={onUpdateNote}
              onToggleUpcomingCase={onToggleUpcomingCase}
              isUpcomingCase={isInUpcomingCases(resource.id)}
              index={index}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
        </div>
      </div>
    </div>
  );
}

function AdminView({ resources, adminTab, setAdminTab, onAddResource, onEditResource, onDeleteResource, onEditCategories, onReorderResources, currentUser, suggestedResources, onShowSuggestedResources, onApproveSuggestion, onRejectSuggestion }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Safe filtering with error handling
  const filteredResources = (resources && Array.isArray(resources)) 
    ? resources.filter(r => {
        if (!r) return false;
        if (searchTerm === '') return true;
        const searchLower = searchTerm.toLowerCase();
        return (r.title && r.title.toLowerCase().includes(searchLower)) ||
               (r.description && r.description.toLowerCase().includes(searchLower));
      })
    : [];

  const pendingCount = (suggestedResources && Array.isArray(suggestedResources)) 
    ? suggestedResources.filter(s => s && s.status === 'pending').length 
    : 0;

  return (
    <div className="animate-slide-up">
      {/* Suggested Resources Banner */}
      {pendingCount > 0 && (
        <div className="mb-6">
          <button
            onClick={onShowSuggestedResources}
            className="w-full glass rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Suggested Resources
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {pendingCount} {pendingCount === 1 ? 'resource' : 'resources'} pending review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {pendingCount}
                </span>
                <ArrowRight size={20} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Manage content and view insights</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1.5 sm:p-2 mb-6 sm:mb-8 shadow-lg inline-flex gap-1 sm:gap-2 w-full sm:w-auto">
        <button
          onClick={() => setAdminTab('resources')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all ${
            adminTab === 'resources' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setAdminTab('analytics')}
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all ${
            adminTab === 'analytics' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="hidden xs:inline">Analytics</span>
          <span className="xs:hidden">Stats</span>
        </button>
      </div>

      {/* Tab Content */}
      {adminTab === 'resources' && (
        <ResourcesManagement
          resources={filteredResources}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddResource={onAddResource}
          onEditResource={onEditResource}
          onDeleteResource={onDeleteResource}
          onEditCategories={onEditCategories}
          onReorderResources={onReorderResources}
        />
      )}

      {adminTab === 'analytics' && (
        <AnalyticsDashboard resources={resources} />
      )}
    </div>
  );
}

function ResourcesManagement({ resources, searchTerm, setSearchTerm, onAddResource, onEditResource, onDeleteResource, onEditCategories, onReorderResources }) {
  const [draggedResourceId, setDraggedResourceId] = useState(null);

  const handleDragStart = (e, resourceId) => {
    setDraggedResourceId(resourceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetResourceId) => {
    e.preventDefault();
    if (!draggedResourceId || draggedResourceId === targetResourceId) return;

    const newOrder = [...resources];
    const draggedIndex = newOrder.findIndex(r => r.id === draggedResourceId);
    const targetIndex = newOrder.findIndex(r => r.id === targetResourceId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    if (onReorderResources) {
      onReorderResources(newOrder);
    }
    setDraggedResourceId(null);
  };
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6 gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Manage Resources</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Add, edit, or remove resources from the library</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onEditCategories}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 glass border-2 border-purple-300 text-purple-700 rounded-xl text-sm sm:text-base font-medium hover:bg-purple-50 transition-colors"
          >
            <Edit size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Edit Categories</span>
            <span className="sm:hidden">Categories</span>
          </button>
        <button
          onClick={onAddResource}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm sm:text-base font-medium glow-button"
        >
            <Plus size={18} className="sm:w-5 sm:h-5" />
          Add Resource
        </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Resources List */}
      <div className="space-y-3 sm:space-y-4">
        {resources.length === 0 ? (
          <div className="glass rounded-2xl p-8 sm:p-16 text-center shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <FileText size={24} className="text-purple-600 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">No resources found</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Click "Add Resource" to get started!</p>
            </div>
          </div>
        ) : (
          resources.map((resource, index) => (
            <AdminResourceCard
              key={resource.id}
              resource={resource}
              onEdit={onEditResource}
              onDelete={onDeleteResource}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedResourceId === resource.id}
            />
          ))
        )}
      </div>
    </>
  );
}

function AnalyticsDashboard({ resources }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      // Load recent view counts
      const { data: views } = await supabase
        .from('resource_views')
        .select('resource_id, view_duration_seconds, completed')
        .gte('viewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      // Load favorite events
      const { data: favoriteEvents } = await supabase
        .from('favorite_events')
        .select('resource_id, time_to_favorite_hours, view_count_before_favorite');

      // Aggregate by resource
      const resourceStats = {};
      
      views?.forEach(view => {
        if (!resourceStats[view.resource_id]) {
          resourceStats[view.resource_id] = {
            viewCount: 0,
            totalDuration: 0,
            completions: 0
          };
        }
        resourceStats[view.resource_id].viewCount++;
        resourceStats[view.resource_id].totalDuration += view.view_duration_seconds || 0;
        if (view.completed) resourceStats[view.resource_id].completions++;
      });

      favoriteEvents?.forEach(event => {
        if (!resourceStats[event.resource_id]) {
          resourceStats[event.resource_id] = { viewCount: 0, totalDuration: 0, completions: 0 };
        }
        resourceStats[event.resource_id].favoriteCount = (resourceStats[event.resource_id].favoriteCount || 0) + 1;
        resourceStats[event.resource_id].avgTimeToFavorite = event.time_to_favorite_hours;
      });

      setAnalyticsData(resourceStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  // Get top resources
  const topResources = resources
    .map(r => ({
      ...r,
      stats: analyticsData?.[r.id] || { viewCount: 0, totalDuration: 0, completions: 0, favoriteCount: 0 }
    }))
    .sort((a, b) => b.stats.viewCount - a.stats.viewCount)
    .slice(0, 10);

  const totalViews = Object.values(analyticsData || {}).reduce((sum, stats) => sum + stats.viewCount, 0);
  const totalFavorites = Object.values(analyticsData || {}).reduce((sum, stats) => sum + (stats.favoriteCount || 0), 0);
  const avgEngagement = totalViews > 0 
    ? Object.values(analyticsData || {}).reduce((sum, stats) => sum + stats.totalDuration, 0) / totalViews / 60
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Views (30d)</h4>
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalViews}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Across all resources</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Favorites</h4>
            <Heart size={20} className="text-red-500" fill="currentColor" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalFavorites}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Learning signals</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Avg Time Spent</h4>
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgEngagement.toFixed(1)}m</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Per resource view</p>
        </div>
      </div>

      {/* Top Resources */}
      <div className="glass rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Top Resources (Last 30 Days)</h3>
        <div className="space-y-3">
          {topResources.map((resource, index) => (
            <div key={resource.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{resource.title}</h4>
                  <p className="text-sm text-gray-600">
                    {resource.stats.viewCount} views • 
                    {resource.stats.favoriteCount || 0} favorites • 
                    {(resource.stats.totalDuration / 60 / (resource.stats.viewCount || 1)).toFixed(1)}m avg
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note about privacy */}
      <div className="glass rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
        <h4 className="font-semibold text-gray-900 mb-2">🔒 Privacy & Trust</h4>
        <p className="text-sm text-gray-600">
          All analytics are aggregated and de-identified. Individual surgeon behavior is never tracked or shared. 
          Industry reports require minimum cohort size of N=10 surgeons.
        </p>
      </div>
    </div>
  );
}

// Continue in next message due to length...

function ResourceCard({ resource, isFavorited, note, onToggleFavorite, onUpdateNote, onToggleUpcomingCase, isUpcomingCase, index, currentUser }) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const [viewTracked, setViewTracked] = useState(false);
  const [rating, setRating] = useState(null); // Current user's rating (private)
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loadingRating, setLoadingRating] = useState(false);

  // Track view when card is visible
  useEffect(() => {
    if (!viewTracked && resource.id) {
      trackResourceCoview(resource.id);
      setViewTracked(true);
    }
  }, [resource.id, viewTracked]);

  // Load ratings
  useEffect(() => {
    if (!resource.id) return;
    
    async function loadRatings() {
      try {
        // Load average rating and count
        // Load current user's rating (private, only visible to this user)
        if (currentUser?.id) {
          const { data: userRating, error: userError } = await supabase
            .from('resource_ratings')
            .select('rating')
            .eq('resource_id', resource.id)
            .eq('user_id', currentUser.id)
            .single();

          if (userError && userError.code !== 'PGRST116') throw userError; // PGRST116 = no rows returned
          
          if (userRating) {
            setRating(userRating.rating);
          }
        }
      } catch (error) {
        console.error('Error loading ratings:', error);
      }
    }

    loadRatings();
  }, [resource.id, currentUser?.id]);

  async function handleRateResource(starRating) {
    if (!currentUser?.id || loadingRating) return;
    
    // Only surgeons and trainees can rate resources
    const canRate = currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee';
    if (!canRate) {
      alert('Only Surgeons and Trainees can rate resources.');
      return;
    }

    try {
      setLoadingRating(true);
      
      // Check if user already rated
      const { data: existingRating, error: checkError } = await supabase
        .from('resource_ratings')
        .select('id')
        .eq('resource_id', resource.id)
        .eq('user_id', currentUser.id)
        .single();

      if (existingRating) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from('resource_ratings')
          .update({ rating: starRating })
          .eq('id', existingRating.id);

        if (updateError) throw updateError;
      } else {
        // Insert new rating
        const { error: insertError } = await supabase
          .from('resource_ratings')
          .insert([{
            resource_id: resource.id,
            user_id: currentUser.id,
            rating: starRating
          }]);

        if (insertError) throw insertError;
      }

      setRating(starRating);
      
      // Track rating event (private ratings, aggregate visible to admin)
      trackRatingEvent(currentUser.id, resource.id, starRating, resource.category_id);
    } catch (error) {
      console.error('Error rating resource:', error);
      alert('Error submitting rating: ' + error.message);
    } finally {
      setLoadingRating(false);
    }
  }

  const getTypeIcon = () => {
    switch(resource.resource_type) {
      case 'video': return <Video size={20} />;
      case 'pdf': return <FileText size={20} />;
      case 'article': return <FileText size={20} />;
      default: return <Link size={20} />;
    }
  };

  const getTypeColor = () => {
    switch(resource.resource_type) {
      case 'video': return 'from-red-500 to-pink-500';
      case 'pdf': return 'from-blue-500 to-cyan-500';
      case 'article': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getTypeLabel = () => {
    switch(resource.resource_type) {
      case 'pdf': return 'PDF / Guide';
      default: return resource.resource_type;
    }
  };

  const handleSaveNote = () => {
    onUpdateNote(resource.id, noteText);
    setShowNoteInput(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`glass rounded-2xl p-6 shadow-lg card-hover animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Image - Smaller on mobile (96px), full size on desktop (192px) */}
        <div className="w-24 h-24 sm:w-48 sm:h-48 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 mx-auto sm:mx-0" style={{ aspectRatio: '1/1' }}>
          {resource.image_url ? (
          <img 
            src={resource.image_url} 
            alt={resource.title}
            className="w-full h-full object-cover"
              style={{ aspectRatio: '1/1' }}
              loading="lazy"
          />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
              <FileText size={24} className="text-gray-400 sm:text-gray-400 text-sm sm:text-base" />
        </div>
      )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Badges */}
          <div className="flex gap-2 mb-3">
        {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs font-medium">
            <Sparkles size={12} />
            <span className="mono">Sponsored</span>
          </div>
        )}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getTypeColor()} text-white text-sm font-medium`}>
          {getTypeIcon()}
          <span className="capitalize">{getTypeLabel()}</span>
              {resource.resource_type === 'video' && resource.duration_seconds && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">
                  {formatDuration(resource.duration_seconds)}
                </span>
              )}
            </div>
        </div>

          <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{resource.title}</h4>
          <p className="text-gray-600 dark:text-gray-300 mb-3">{resource.description}</p>
          
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-600 hover:text-purple-700 text-sm break-all flex items-center gap-1 mb-4"
          >
            <span>{resource.url}</span>
            <ArrowRight size={14} />
          </a>

        {/* Personal Rating (Private - only visible to this user) */}
        {currentUser && (currentUser.userType === 'surgeon' || currentUser.userType === 'trainee') && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">My Rating:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = hoveredStar ? star <= hoveredStar : (rating ? star <= rating : false);
                  return (
                    <button
                      key={star}
                      onClick={() => handleRateResource(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      disabled={loadingRating}
                      className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Star 
                        size={18} 
                        fill={isFilled ? '#FBBF24' : 'none'} 
                        stroke={isFilled ? '#FBBF24' : '#D1D5DB'} 
                        className={`transition-colors ${!loadingRating && currentUser ? 'hover:scale-110' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Note Display */}
        {note && !showNoteInput && (
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
            <div className="flex justify-between items-start gap-2">
              <p className="text-gray-700 text-sm flex-1">{note}</p>
              <button
                onClick={() => {
                  setNoteText(note);
                  setShowNoteInput(true);
                }}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Edit size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Note Input */}
        {showNoteInput && (
          <div className="mb-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your personal note..."
              className="w-full p-3 border-2 border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none transition-colors"
              rows="3"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText(note || '');
                }}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`p-2.5 rounded-lg transition-all ${
                note 
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={note ? 'Edit Note' : 'Add Note'}
              aria-label={note ? 'Edit Note' : 'Add Note'}
            >
              <StickyNote size={18} fill={note ? 'currentColor' : 'none'} />
            </button>
            {(currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
              <button
                onClick={() => onToggleFavorite(resource.id)}
                className={`p-2.5 rounded-lg transition-all ${
                  isFavorited 
                    ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            )}
            {onToggleUpcomingCase && (currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
              <button
                onClick={() => onToggleUpcomingCase(resource.id)}
                className={`p-2.5 rounded-lg transition-all ${
                  isUpcomingCase 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases'}
                aria-label={isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases'}
              >
                <Plus size={18} className={isUpcomingCase ? 'rotate-45' : ''} />
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminResourceCard({ resource, onEdit, onDelete, index, onDragStart, onDragOver, onDrop, isDragging }) {
  const getTypeIcon = () => {
    switch(resource.resource_type) {
      case 'video': return <Video size={20} />;
      case 'pdf': return <FileText size={20} />;
      case 'article': return <FileText size={20} />;
      default: return <Link size={20} />;
    }
  };

  const getTypeColor = () => {
    switch(resource.resource_type) {
      case 'video': return 'from-red-500 to-pink-500';
      case 'pdf': return 'from-blue-500 to-cyan-500';
      case 'article': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getTypeLabel = () => {
    switch(resource.resource_type) {
      case 'pdf': return 'PDF / Guide';
      default: return resource.resource_type;
    }
  };

  return (
    <div 
      draggable={onDragStart !== undefined}
      onDragStart={onDragStart ? (e) => onDragStart(e, resource.id) : undefined}
      onDragOver={onDragOver || undefined}
      onDrop={onDrop ? (e) => onDrop(e, resource.id) : undefined}
      className={`glass rounded-2xl p-4 sm:p-6 shadow-lg card-hover animate-slide-up cursor-move ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {onDragStart && (
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs">
          <GripVertical size={16} className="cursor-grab active:cursor-grabbing" />
          <span>Drag to reorder</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Image - Smaller on mobile (96px), full size on desktop (192px) - Square */}
        <div className="w-24 h-24 sm:w-48 sm:h-48 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 mx-auto sm:mx-0" style={{ aspectRatio: '1/1' }}>
          {resource.image_url ? (
            <img 
              src={resource.image_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '1/1' }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
              <FileText size={20} className="text-gray-400 sm:text-gray-400" />
          </div>
        )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs font-medium">
                <Sparkles size={12} />
                <span className="mono">Sponsored</span>
              </div>
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getTypeColor()} text-white text-xs sm:text-sm font-medium`}>
              {getTypeIcon()}
              <span className="capitalize">{getTypeLabel()}</span>
            </div>
          </div>

          <h4 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white mb-2 break-words">{resource.title}</h4>
          <p className="text-gray-600 mb-3 text-sm sm:text-base break-words">{resource.description}</p>
          
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-600 hover:text-purple-700 text-xs sm:text-sm break-all flex items-center gap-1 mb-4"
          >
            <span className="truncate">{resource.url}</span>
            <ArrowRight size={14} className="flex-shrink-0" />
          </a>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onEdit(resource)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm sm:text-base font-medium hover:bg-purple-200 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm sm:text-base font-medium hover:bg-red-200 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddResourceModal({ currentUser, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'video',
    description: '',
    duration_seconds: null,
    keywords: ''
  });
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Specialty/Subspecialty/Category selection (Procedure removed per user request)
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [canEditSpecialty, setCanEditSpecialty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const isInitialLoad = useRef(true);

  // Initialize with user's specialty/subspecialty
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedSpecialty && !isInitialLoad.current) {
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty && !isInitialLoad.current) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);


  async function loadInitialData() {
    try {
      setLoadingData(true);
      setImageError(''); // Clear any previous errors
      
      // Load all specialties
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      
      if (specialtiesError) {
        throw new Error(`Failed to load specialties: ${specialtiesError.message}`);
      }
      
      setSpecialties(specialtiesData || []);

      // Pre-populate with user's specialty/subspecialty if available
      if (currentUser?.specialtyId) {
        // Load subspecialties for this specialty first
        const { data: subspecialtiesData, error: subspecialtiesError } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        
        if (subspecialtiesError) {
          throw new Error(`Failed to load subspecialties: ${subspecialtiesError.message}`);
        }
        
        setSubspecialties(subspecialtiesData || []);
        
        // Now set the specialty (this will trigger useEffect, but we've already loaded subspecialties)
        setSelectedSpecialty(String(currentUser.specialtyId));
        
        if (currentUser?.subspecialtyId) {
          // Load categories for the subspecialty first
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('subspecialty_id', currentUser.subspecialtyId)
            .is('parent_category_id', null)
            .order('order');
          
          if (categoriesError) {
            throw new Error(`Failed to load categories: ${categoriesError.message}`);
          }
          
          setCategories(categoriesData || []);
          
          // Now set the subspecialty (this will trigger useEffect, but we've already loaded categories)
          setSelectedSubspecialty(String(currentUser.subspecialtyId));
        }
      }
      
      // Mark initial load as complete
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setImageError(`Error loading form data: ${errorMessage}`);
      alert(`Error loading form data:\n\n${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoadingData(false);
      isInitialLoad.current = false;
    }
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) return;
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order');
    
    setSubspecialties(data || []);
    // Only clear if specialty actually changed (not on initial load)
    if (selectedSpecialty && selectedSpecialty !== String(specialtyId)) {
      setSelectedCategory(null);
    }
  }

  async function loadCategories(subspecialtyId) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null) // Top-level categories only for now
      .order('order');
    
    setCategories(data || []);
  }


  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadCategories(subspecialtyId);
  };

  const handleCategoryChange = (categoryId) => {
    if (categoryId === 'add_new') {
      setShowNewCategoryInput(true);
      setSelectedCategory(null);
      return;
    }
    setShowNewCategoryInput(false);
    setSelectedCategory(categoryId);
  };

  async function handleAddNewCategory() {
    if (!newCategoryName.trim() || !selectedSubspecialty) return;

    try {
      setAddingCategory(true);
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategoryName.trim(),
          subspecialty_id: selectedSubspecialty,
          parent_category_id: null,
          order: maxOrder + 1,
          depth: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setSelectedCategory(data.id);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }


  const processImageFile = async (file) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageError('');
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageError('');
    setProcessingImage(true);

    try {
      // Process image (resize and compress)
      const processedFile = await processResourceImage(file);
      setImageFile(processedFile);
      
      // Create preview from processed file
      const preview = await createImagePreview(processedFile);
      setImagePreview(preview);
    } catch (error) {
      setImageError(error.message);
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    } else {
      setImageError('Please drop an image file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      setImageError('Image is required');
      return;
    }

    setImageError('');
    // Include category_id in the submission
    onSubmit({ ...formData, category_id: selectedCategory }, imageFile);
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Resource</h2>
          <p className="text-gray-600 mb-6">Add a surgical technique resource to the library</p>
          
          {imageError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-medium">{imageError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Specialty/Subspecialty Selection */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Specialty & Subspecialty
                </label>
                {!canEditSpecialty && (selectedSpecialty || selectedSubspecialty) && (
                  <button
                    type="button"
                    onClick={() => setCanEditSpecialty(true)}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Edit size={12} className="inline mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {loadingData ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Specialty */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
                    <select
                      value={selectedSpecialty || ''}
                      onChange={(e) => handleSpecialtyChange(e.target.value)}
                      disabled={!canEditSpecialty && !!selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select specialty...</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subspecialty */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Subspecialty</label>
                    <select
                      value={selectedSubspecialty || ''}
                      onChange={(e) => handleSubspecialtyChange(e.target.value)}
                      disabled={(!canEditSpecialty && !!selectedSubspecialty) || !selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select subspecialty...</option>
                      {subspecialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Category Selection */}
            {selectedSubspecialty && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                {showNewCategoryInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                      placeholder="Enter new category name..."
                      className="w-full px-4 py-3 border-2 border-purple-500 rounded-xl focus:border-purple-600 focus:outline-none transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingCategory ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCategory || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value="add_new" className="font-semibold text-purple-600">
                      + Add new category
                    </option>
                  </select>
                )}
              </div>
            )}


            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image * 
                <span className="text-xs font-normal text-gray-500 ml-2">(Max 2MB, will be resized to 800x800px - square format)</span>
              </label>
              
              {processingImage ? (
                <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-purple-300 rounded-xl bg-purple-50" style={{ aspectRatio: '1/1', minHeight: '180px' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                  <span className="text-sm text-gray-600">Processing image...</span>
                </div>
              ) : imagePreview ? (
                <div className="relative" style={{ aspectRatio: '1/1' }}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setImageError('');
                      // Reset file input
                      const fileInput = document.querySelector('input[type="file"]');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    800x800px (1:1)
                  </div>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-100 scale-105' 
                      : 'border-gray-300 hover:border-purple-500 bg-gray-50'
                  }`}
                  style={{ aspectRatio: '1/1', minHeight: '180px' }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className={`${isDragging ? 'text-purple-600' : 'text-gray-400'} mb-2 transition-colors`} />
                  <span className={`text-sm font-medium transition-colors ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Square format (1:1)</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (Max 2MB)</span>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <p className="font-medium mb-1">How to screenshot:</p>
                    <p className="mb-0.5">Windows: Press <span className="font-mono bg-gray-100 px-1 rounded">Windows + Shift + S</span> or use Snipping Tool</p>
                    <p>Mac: Press <span className="font-mono bg-gray-100 px-1 rounded">Cmd + Shift + 4</span> to capture selected area</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    required
                  />
                </label>
              )}
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Ankle Arthroscopy Technique"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL *</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, duration_seconds: e.target.value !== 'video' ? null : formData.duration_seconds })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Duration field - only for videos */}
            {formData.type === 'video' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video Duration *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={durationHours}
                    onChange={(e) => {
                      const hrs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationHours(e.target.value);
                      const totalSeconds = (hrs === '' ? 0 : hrs) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="H"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => {
                      const mins = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationMinutes(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (mins === '' ? 0 : mins) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="MM"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSeconds}
                    onChange={(e) => {
                      const secs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationSeconds(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (secs === '' ? 0 : secs);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="SS"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: H:MM:SS (e.g., 0:05:30 for 5 minutes 30 seconds)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                rows="4"
                placeholder="Brief description of the resource..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Words</label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Enter key words separated by commas (e.g., bunion, MIS, osteotomy)"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Add key words to help with searchability</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!imageFile || (formData.type === 'video' && !formData.duration_seconds)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Resource
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SuggestResourceModal({ currentUser, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'video',
    description: '',
    duration_seconds: null,
    keywords: ''
  });
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Specialty/Subspecialty/Category selection (Procedure removed per user request)
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [canEditSpecialty, setCanEditSpecialty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const isInitialLoad = useRef(true);
  // Debug logging
  useEffect(() => {
    console.log("🔍 SuggestResourceModal opened");
    console.log("currentUser:", currentUser);
    console.log("specialtyId:", currentUser?.specialtyId);
    console.log("subspecialtyId:", currentUser?.subspecialtyId);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('🔍 SuggestResourceModal opened');
    console.log('currentUser:', currentUser);
    console.log('specialtyId:', currentUser?.specialtyId);
    console.log('subspecialtyId:', currentUser?.subspecialtyId);
  }, []);

  // Initialize with user's specialty/subspecialty
  useEffect(() => {
    if (currentUser) {
      alert('🎯 SUGGEST MODAL OPENED! New code is loaded!');
      loadInitialData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedSpecialty && !isInitialLoad.current) {
      // Load subspecialties when specialty is selected
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty && !isInitialLoad.current) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);


  async function loadInitialData() {
    console.log('📥 SuggestResource - Loading initial data...');
    console.log('currentUser:', currentUser);
    console.log('currentUser.specialtyId:', currentUser?.specialtyId);
    console.log('currentUser.subspecialtyId:', currentUser?.subspecialtyId);
    
    try {
      setLoadingData(true);
      setImageError(''); // Clear any previous errors
      
      console.log('🔍 Fetching specialties from database...');
      
      // Load all specialties
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      
      if (specialtiesError) {
        console.error('❌ Error loading specialties:', specialtiesError);
        throw new Error(`Failed to load specialties: ${specialtiesError.message}`);
      }
      
      console.log('✅ Loaded specialties:', specialtiesData?.length || 0);
      setSpecialties(specialtiesData || []);

      // Pre-populate with user's specialty/subspecialty if available
      if (currentUser?.specialtyId) {
        // Load subspecialties for this specialty first
        const { data: subspecialtiesData, error: subspecialtiesError } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        
        if (subspecialtiesError) {
          throw new Error(`Failed to load subspecialties: ${subspecialtiesError.message}`);
        }
        
        setSubspecialties(subspecialtiesData || []);
        
        // Now set the specialty (this will trigger useEffect, but we've already loaded subspecialties)
        setSelectedSpecialty(String(currentUser.specialtyId));
        
        if (currentUser?.subspecialtyId) {
          // Load categories for the subspecialty first
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('subspecialty_id', currentUser.subspecialtyId)
            .is('parent_category_id', null)
            .order('order');
          
          if (categoriesError) {
            throw new Error(`Failed to load categories: ${categoriesError.message}`);
          }
          
          setCategories(categoriesData || []);
          
          // Now set the subspecialty (this will trigger useEffect, but we've already loaded categories)
          setSelectedSubspecialty(String(currentUser.subspecialtyId));
        }
      }
      
      // Mark initial load as complete
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setImageError(`Error loading form data: ${errorMessage}`);
      alert(`Error loading form data:\n\n${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoadingData(false);
      isInitialLoad.current = false;
    }
  }

  async function loadSubspecialties(specialtyId) {
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order');
    
    setSubspecialties(data || []);
    // Clear category when specialty changes
    setSelectedCategory(null);
  }

  async function loadCategories(subspecialtyId) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null) // Top-level categories only for now
      .order('order');
    
    setCategories(data || []);
  }


  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadCategories(subspecialtyId);
  };

  const handleCategoryChange = (categoryId) => {
    if (categoryId === 'add_new') {
      setShowNewCategoryInput(true);
      setSelectedCategory(null);
      return;
    }
    setShowNewCategoryInput(false);
    setSelectedCategory(categoryId);
  };

  async function handleAddNewCategory() {
    if (!newCategoryName.trim() || !selectedSubspecialty) return;

    try {
      setAddingCategory(true);
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategoryName.trim(),
          subspecialty_id: selectedSubspecialty,
          parent_category_id: null,
          order: maxOrder + 1,
          depth: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setSelectedCategory(data.id);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }


  const processImageFile = async (file) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageError('');
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageError('');
    setProcessingImage(true);

    try {
      // Process image (resize and compress)
      const processedFile = await processResourceImage(file);
      setImageFile(processedFile);
      
      // Create preview from processed file
      const preview = await createImagePreview(processedFile);
      setImagePreview(preview);
    } catch (error) {
      setImageError(error.message);
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    } else {
      setImageError('Please drop an image file');
    }
  };

  const handleSubmit = async (e) => {
    window.SUBMIT_FIRED = true; // Global flag we can check
    window.SUBMIT_COUNT = (window.SUBMIT_COUNT || 0) + 1;
    console.log('🎯 FORM SUBMIT FIRED - TOP OF FUNCTION - COUNT:', window.SUBMIT_COUNT);
    alert('SUBMIT HANDLER CALLED!'); // Visible confirmation
    e.preventDefault();
    
    console.log('📝 Form submitted');
    console.log('imageFile:', imageFile);
    console.log('formData:', formData);
    console.log('selectedCategory:', selectedCategory);
    
    if (!imageFile) {
      setImageError('Image is required');
      return;
    }

    setImageError('');
    setSubmitting(true);
    
    // Safety timeout - if submission takes more than 30 seconds, reset
    const timeoutId = setTimeout(() => {
      console.error('⏱️ TIMEOUT: Submission took too long (30s), resetting...');
      setSubmitting(false);
      setImageError('Submission timed out. Please try again.');
    }, 30000);
    
    try {
      console.log('⏳ Calling onSubmit...');
      // Include category_id in the submission
      await onSubmit({ ...formData, category_id: selectedCategory }, imageFile);
      console.log('✅ onSubmit completed successfully');
      
      clearTimeout(timeoutId); // Clear timeout on success
      
      // Reset form
      setFormData({
        title: '',
        url: '',
        type: 'video',
        description: '',
        duration_seconds: null,
        keywords: ''
      });
      setImageFile(null);
      setImagePreview(null);
      setSelectedCategory(null);
      setSelectedSubspecialty(null);
      setSelectedSpecialty(null);
      setDurationHours('');
      setDurationMinutes('');
      setDurationSeconds('');
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error('❌ Error in handleSubmit:', error);
      setImageError(error.message || 'Failed to submit suggestion. Please try again.');
    } finally {
      console.log('🔄 Setting submitting to false');
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Suggest New Resource</h2>
          <p className="text-gray-600 mb-6">Submit a resource for review. An admin will review it before it appears in the library.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Specialty/Subspecialty Selection */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Specialty & Subspecialty
                </label>
                {!canEditSpecialty && (selectedSpecialty || selectedSubspecialty) && (
                  <button
                    type="button"
                    onClick={() => setCanEditSpecialty(true)}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Edit size={12} className="inline mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {loadingData ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Specialty */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
                    <select
                      value={selectedSpecialty || ''}
                      onChange={(e) => handleSpecialtyChange(e.target.value)}
                      disabled={!canEditSpecialty && !!selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select specialty...</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subspecialty */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Subspecialty</label>
                    <select
                      value={selectedSubspecialty || ''}
                      onChange={(e) => handleSubspecialtyChange(e.target.value)}
                      disabled={(!canEditSpecialty && !!selectedSubspecialty) || !selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select subspecialty...</option>
                      {subspecialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Category Selection */}
            {selectedSubspecialty && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                {showNewCategoryInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                      placeholder="Enter new category name..."
                      className="w-full px-4 py-3 border-2 border-purple-500 rounded-xl focus:border-purple-600 focus:outline-none transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingCategory ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCategory || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value="add_new" className="font-semibold text-purple-600">
                      + Add new category
                    </option>
                  </select>
                )}
              </div>
            )}


            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image * 
                <span className="text-xs font-normal text-gray-500 ml-2">(Max 2MB, will be resized to 800x800px - square format)</span>
              </label>
              
              {processingImage ? (
                <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-purple-300 rounded-xl bg-purple-50" style={{ aspectRatio: '1/1', minHeight: '180px' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                  <span className="text-sm text-gray-600">Processing image...</span>
                </div>
              ) : imagePreview ? (
                <div className="relative" style={{ aspectRatio: '1/1' }}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setImageError('');
                      const fileInput = document.querySelector('input[type="file"]');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    800x800px (1:1)
                  </div>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-100 scale-105' 
                      : 'border-gray-300 hover:border-purple-500 bg-gray-50'
                  }`}
                  style={{ aspectRatio: '1/1', minHeight: '180px' }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className={`${isDragging ? 'text-purple-600' : 'text-gray-400'} mb-2 transition-colors`} />
                  <span className={`text-sm font-medium transition-colors ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Square format (1:1)</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (Max 2MB)</span>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <p className="font-medium mb-1">How to screenshot:</p>
                    <p className="mb-0.5">Windows: Press <span className="font-mono bg-gray-100 px-1 rounded">Windows + Shift + S</span> or use Snipping Tool</p>
                    <p>Mac: Press <span className="font-mono bg-gray-100 px-1 rounded">Cmd + Shift + 4</span> to capture selected area</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    required
                  />
                </label>
              )}
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Ankle Arthroscopy Technique"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL *</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, duration_seconds: e.target.value !== 'video' ? null : formData.duration_seconds })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Duration field - only for videos */}
            {formData.type === 'video' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video Duration *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={durationHours}
                    onChange={(e) => {
                      const hrs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationHours(e.target.value);
                      const totalSeconds = (hrs === '' ? 0 : hrs) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="H"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => {
                      const mins = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationMinutes(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (mins === '' ? 0 : mins) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="MM"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSeconds}
                    onChange={(e) => {
                      const secs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationSeconds(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (secs === '' ? 0 : secs);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="SS"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: H:MM:SS (e.g., 0:05:30 for 5 minutes 30 seconds)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                rows="4"
                placeholder="Brief description of the resource..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Words</label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Enter key words separated by commas (e.g., bunion, MIS, osteotomy)"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Add key words to help with searchability</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !imageFile || (formData.type === 'video' && !formData.duration_seconds)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {submitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditResourceModal({ resource, currentUser, onSubmit, onClose }) {
  // Parse duration_seconds into hours, minutes, seconds
  const parseDuration = (seconds) => {
    if (!seconds) return { hours: '', minutes: '', seconds: '' };
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { hours: hrs.toString(), minutes: mins.toString(), seconds: secs.toString() };
  };

  const initialDuration = parseDuration(resource.duration_seconds);
  
  const [formData, setFormData] = useState({
    title: resource.title || '',
    url: resource.url || '',
    type: resource.resource_type || 'video',
    description: resource.description || '',
    keywords: resource.keywords || '',
    duration_seconds: resource.duration_seconds || null
  });
  const [durationHours, setDurationHours] = useState(initialDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(initialDuration.minutes);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration.seconds);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Specialty/Subspecialty/Category selection
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const isInitialLoad = useRef(true);

  // Load initial data - get category, subspecialty hierarchy for prepopulation
  useEffect(() => {
    loadInitialData();
  }, [resource.id]);

  useEffect(() => {
    if (selectedSpecialty && !isInitialLoad.current) {
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty && !isInitialLoad.current) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);


  // Initialize preview with existing image if available
  useEffect(() => {
    if (resource.image_url && !imagePreview && !imageFile) {
      setImagePreview(resource.image_url);
    }
  }, [resource.image_url]);

  async function loadInitialData() {
    try {
      isInitialLoad.current = true;
      setLoadingData(true);
      
      // Load all specialties
      const { data: specialtiesData } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      setSpecialties(specialtiesData || []);

      let didPrepopulate = false;

      // 1) If resource has procedure_id, use procedure -> category -> subspecialty -> specialty
      if (resource.procedure_id) {
        const { data: procedureRow, error: procErr } = await supabase
          .from('procedures')
          .select('id, category_id')
          .eq('id', resource.procedure_id)
          .single();
        
        if (!procErr && procedureRow) {
          const { data: categoryRow, error: catErr } = await supabase
            .from('categories')
            .select('id, subspecialty_id')
            .eq('id', procedureRow.category_id)
            .single();
          
          if (!catErr && categoryRow) {
            const { data: subspecialtyRow, error: subErr } = await supabase
              .from('subspecialties')
              .select('id, specialty_id')
              .eq('id', categoryRow.subspecialty_id)
              .single();
            
            if (!subErr && subspecialtyRow) {
              didPrepopulate = true;
              const [
                { data: subspecialtiesData, error: subsErr },
                { data: categoriesData, error: catsErr },
              ] = await Promise.all([
                supabase.from('subspecialties').select('*').eq('specialty_id', subspecialtyRow.specialty_id).order('order'),
                supabase.from('categories').select('*').eq('subspecialty_id', subspecialtyRow.id).is('parent_category_id', null).order('order'),
              ]);
              if (subsErr || catsErr) throw subsErr || catsErr;
              setSubspecialties(subspecialtiesData || []);
              setCategories(categoriesData || []);
              setSelectedSpecialty(String(subspecialtyRow.specialty_id));
              setSelectedSubspecialty(String(subspecialtyRow.id));
              setSelectedCategory(String(categoryRow.id));
            }
          }
        }
      }

      // 2) Else if resource has category_id, use category -> subspecialty -> specialty
      if (!didPrepopulate && resource.category_id) {
        const { data: categoryRow, error: catErr } = await supabase
          .from('categories')
          .select('id, subspecialty_id, parent_category_id')
          .eq('id', resource.category_id)
          .single();
        if (!catErr && categoryRow) {
          const { data: subspecialtyRow, error: subErr } = await supabase
            .from('subspecialties')
            .select('id, specialty_id')
            .eq('id', categoryRow.subspecialty_id)
            .single();
          if (!subErr && subspecialtyRow) {
            didPrepopulate = true;
            const [
              { data: subspecialtiesData, error: subsErr },
              { data: categoriesData, error: catsErr },
            ] = await Promise.all([
              supabase.from('subspecialties').select('*').eq('specialty_id', subspecialtyRow.specialty_id).order('order'),
              supabase.from('categories').select('*').eq('subspecialty_id', subspecialtyRow.id).is('parent_category_id', null).order('order'),
            ]);
            if (subsErr || catsErr) throw subsErr || catsErr;
            setSubspecialties(subspecialtiesData || []);
            setCategories(categoriesData || []);
            setSelectedSpecialty(String(subspecialtyRow.specialty_id));
            setSelectedSubspecialty(String(subspecialtyRow.id));
            
            // Check if the selected category is a subcategory
            const isSubcategory = categoryRow.parent_category_id !== null;
            if (isSubcategory) {
              // It's a subcategory - set parent category and load subcategories
              setSelectedCategory(String(categoryRow.parent_category_id));
              await loadSubcategories(categoryRow.parent_category_id);
              setSelectedSubcategory(String(categoryRow.id));
            } else {
              // It's a top-level category
              setSelectedCategory(String(categoryRow.id));
              await loadSubcategories(categoryRow.id);
            }
          }
        }
      }

      // 3) Else use currentUser's specialty/subspecialty (admin profile)
      if (!didPrepopulate && currentUser?.specialtyId) {
        const { data: subspecialtiesData, error: subsErr } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        if (!subsErr && subspecialtiesData?.length) {
          setSubspecialties(subspecialtiesData);
          setSelectedSpecialty(String(currentUser.specialtyId));
          if (currentUser.subspecialtyId) {
            const { data: categoriesData, error: catsErr } = await supabase
              .from('categories')
              .select('*')
              .eq('subspecialty_id', currentUser.subspecialtyId)
              .order('depth')
              .order('order');
            if (!catsErr) {
              setCategories(categoriesData || []);
              setSelectedSubspecialty(String(currentUser.subspecialtyId));
            }
          }
        }
      }
      
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Error loading category data: ' + error.message);
    } finally {
      setLoadingData(false);
      isInitialLoad.current = false;
    }
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) return;
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order');
    setSubspecialties(data || []);
    if (selectedSubspecialty && !data?.find(s => String(s.id) === String(selectedSubspecialty))) {
      setSelectedSubspecialty(null);
      setSelectedCategory(null);
    }
  }

  async function loadCategories(subspecialtyId) {
    if (!subspecialtyId) return;
    // Load ONLY top-level categories (no subcategories)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null)
      .order('order');
    setCategories(data || []);
    // Clear subcategories when subspecialty changes
    setSubcategories([]);
    setSelectedSubcategory(null);
    // Only clear selectedCategory if it doesn't belong to this subspecialty
    if (selectedCategory && data) {
      const categoryExists = data.some(c => String(c.id) === String(selectedCategory));
      if (!categoryExists) {
        setSelectedCategory(null);
      }
    }
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      setSelectedSubcategory(null);
      return;
    }
    // Load subcategories for the selected category
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_category_id', categoryId)
      .order('order');
    setSubcategories(data || []);
    // Clear selected subcategory if it's not in the new list
    if (selectedSubcategory && data) {
      const subcategoryExists = data.some(c => String(c.id) === String(selectedSubcategory));
      if (!subcategoryExists) {
        setSelectedSubcategory(null);
      }
    }
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadCategories(subspecialtyId);
  };

  const handleCategoryChange = (categoryId) => {
    console.log('EditResourceModal handleCategoryChange called with:', categoryId);
    const newCategoryId = categoryId && categoryId !== '' ? categoryId : null;
    setSelectedCategory(newCategoryId);
    setSelectedSubcategory(null); // Clear subcategory when category changes
    loadSubcategories(newCategoryId);
  };

  const handleSubcategoryChange = (subcategoryId) => {
    console.log('EditResourceModal handleSubcategoryChange called with:', subcategoryId);
    setSelectedSubcategory(subcategoryId && subcategoryId !== '' ? subcategoryId : null);
  };


  const processImageFile = async (file) => {
    if (!file) {
      // If no file selected, keep existing image
      return;
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setImageFile(null);
      return;
    }

    setImageError('');
    setProcessingImage(true);

    try {
      // Process image (resize and compress)
      const processedFile = await processResourceImage(file);
      setImageFile(processedFile);
      
      // Create preview from processed file
      const preview = await createImagePreview(processedFile);
      setImagePreview(preview);
    } catch (error) {
      setImageError(error.message);
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    } else {
      setImageError('Please drop an image file');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setImageError('');
    setSubmitting(true);
    
    try {
      // Determine image URL:
      // - If new image uploaded, it will be handled in handleEditResource
      // - If image removed (no preview and no file), set to null
      // - Otherwise keep existing image
      let imageUrl = resource.image_url;
      if (!imagePreview && !imageFile) {
        // User removed the image
        imageUrl = null;
      }
      
      // Use subcategory if selected, otherwise use category
      const finalCategoryId = selectedSubcategory && selectedSubcategory !== '' 
        ? selectedSubcategory 
        : (selectedCategory && selectedCategory !== '' ? selectedCategory : null);
      
      const resourceData = {
        ...formData,
        image_url: imageUrl,
        category_id: finalCategoryId
      };
      
      console.log('EditResourceModal submitting - selectedCategory:', selectedCategory, 'category_id:', resourceData.category_id);
      
      await onSubmit(resourceData, imageFile); // imageFile will be null if not changed
    } catch (error) {
      console.error('Error updating resource:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Resource</h2>
          <p className="text-gray-600 mb-6">Update resource details. Upload a new image to replace the existing one.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload/Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image
                <span className="text-xs font-normal text-gray-500 ml-2">(Max 2MB, will be resized to 800x450px)</span>
              </label>
              
              {processingImage ? (
                <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-purple-300 rounded-xl bg-purple-50" style={{ aspectRatio: '1/1', minHeight: '180px' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                  <span className="text-sm text-gray-600">Processing image...</span>
                </div>
              ) : imagePreview ? (
                <div className="relative" style={{ aspectRatio: '1/1' }}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    800x800px (1:1)
                  </div>
                  <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
                    Change Image
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-100 scale-105 shadow-lg' 
                      : 'border-gray-300 hover:border-purple-500 bg-gray-50'
                  }`}
                  style={{ aspectRatio: '1/1', minHeight: '180px' }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className={`${isDragging ? 'text-purple-600' : 'text-gray-400'} mb-2 transition-colors`} />
                  <span className={`text-sm font-medium transition-colors ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Square format (1:1)</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (Max 2MB)</span>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <p className="font-medium mb-1">How to screenshot:</p>
                    <p className="mb-0.5">Windows: Press <span className="font-mono bg-gray-100 px-1 rounded">Windows + Shift + S</span> or use Snipping Tool</p>
                    <p>Mac: Press <span className="font-mono bg-gray-100 px-1 rounded">Cmd + Shift + 4</span> to capture selected area</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                </label>
              )}
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
            </div>

            {/* Specialty/Subspecialty/Category Selection */}
            {loadingData ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading categories...</p>
              </div>
            ) : (
              <>
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Specialty & Subspecialty
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Specialty */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
                      <select
                        value={selectedSpecialty || ''}
                        onChange={(e) => handleSpecialtyChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      >
                        <option value="">Select specialty...</option>
                        {specialties.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subspecialty */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Subspecialty</label>
                      <select
                        value={selectedSubspecialty || ''}
                        onChange={(e) => handleSubspecialtyChange(e.target.value)}
                        disabled={!selectedSpecialty}
                        className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      >
                        <option value="">Select subspecialty...</option>
                        {subspecialties.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Category Selection */}
                {selectedSubspecialty && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select category...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subcategory Selection - only show if category has subcategories */}
                {selectedCategory && subcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory (Optional)</label>
                    <select
                      value={selectedSubcategory || ''}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">No subcategory</option>
                      {subcategories.map(subcat => (
                        <option key={subcat.id} value={String(subcat.id)}>{subcat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Ankle Arthroscopy Technique"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL *</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, duration_seconds: e.target.value !== 'video' ? null : formData.duration_seconds })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Duration field - only for videos */}
            {formData.type === 'video' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video Duration *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={durationHours}
                    onChange={(e) => {
                      const hrs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationHours(e.target.value);
                      const totalSeconds = (hrs === '' ? 0 : hrs) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="H"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => {
                      const mins = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationMinutes(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (mins === '' ? 0 : mins) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="MM"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSeconds}
                    onChange={(e) => {
                      const secs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationSeconds(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (secs === '' ? 0 : secs);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="SS"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: H:MM:SS (e.g., 0:05:30 for 5 minutes 30 seconds)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                rows="4"
                placeholder="Brief description of the resource..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Words</label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Enter key words separated by commas (e.g., bunion, MIS, osteotomy)"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Add key words to help with searchability</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (formData.type === 'video' && !formData.duration_seconds)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CategoryManagementModal({ currentUser, onClose }) {
  const [allCategories, setAllCategories] = useState([]); // All categories flat
  const [categories, setCategories] = useState([]); // Organized hierarchically
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropIndex, setDropIndex] = useState(null); // Track where item will be dropped
  const [dropPosition, setDropPosition] = useState(null); // 'above' or 'below'
  const [newSubcategoryNames, setNewSubcategoryNames] = useState({}); // { categoryId: name }
  const [addingSubcategory, setAddingSubcategory] = useState({}); // { categoryId: true/false }
  const [expandedCategories, setExpandedCategories] = useState({}); // Track which categories are expanded

  useEffect(() => {
    loadCategories();
  }, []);

  // Organize categories hierarchically
  useEffect(() => {
    if (allCategories.length === 0) {
      setCategories([]);
      return;
    }

    const topLevel = allCategories.filter(c => !c.parent_category_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    const organized = topLevel.map(cat => ({
      ...cat,
      subcategories: allCategories
        .filter(sc => sc.parent_category_id === cat.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
    setCategories(organized);
  }, [allCategories]);

  async function loadCategories() {
    if (!currentUser?.subspecialtyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Load ALL categories (both top-level and subcategories)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('subspecialty_id', currentUser.subspecialtyId)
        .order('order');

      if (error) throw error;
      setAllCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error loading categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;

    try {
      setAddingCategory(true);
      const maxOrder = allCategories.filter(c => !c.parent_category_id).length > 0 
        ? Math.max(...allCategories.filter(c => !c.parent_category_id).map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategoryName.trim(),
          subspecialty_id: currentUser.subspecialtyId,
          parent_category_id: null,
          order: maxOrder + 1,
          depth: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setAllCategories([...allCategories, data]);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleAddSubcategory(parentCategoryId) {
    const subcategoryName = newSubcategoryNames[parentCategoryId];
    if (!subcategoryName?.trim()) return;

    try {
      setAddingSubcategory({ ...addingSubcategory, [parentCategoryId]: true });
      const parentSubcategories = allCategories.filter(c => c.parent_category_id === parentCategoryId);
      const maxOrder = parentSubcategories.length > 0 
        ? Math.max(...parentSubcategories.map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: subcategoryName.trim(),
          subspecialty_id: currentUser.subspecialtyId,
          parent_category_id: parentCategoryId,
          order: maxOrder + 1,
          depth: 1
        }])
        .select()
        .single();

      if (error) throw error;
      
      setAllCategories([...allCategories, data]);
      setNewSubcategoryNames({ ...newSubcategoryNames, [parentCategoryId]: '' });
      setExpandedCategories({ ...expandedCategories, [parentCategoryId]: true });
    } catch (error) {
      console.error('Error adding subcategory:', error);
      alert('Error adding subcategory: ' + error.message);
    } finally {
      setAddingSubcategory({ ...addingSubcategory, [parentCategoryId]: false });
    }
  }

  async function handleUpdateCategory(categoryId, newName) {
    if (!newName.trim()) {
      setEditingId(null);
      setEditingName('');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);

      if (error) throw error;

      setAllCategories(allCategories.map(cat => 
        cat.id === categoryId ? { ...cat, name: newName.trim() } : cat
      ));
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category: ' + error.message);
    }
  }

  async function handleDeleteCategory(categoryId) {
    const category = allCategories.find(c => c.id === categoryId);
    const hasSubcategories = allCategories.some(c => c.parent_category_id === categoryId);
    
    if (hasSubcategories) {
      if (!confirm('This category has subcategories. Deleting it will also delete all subcategories. Are you sure?')) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
        return;
      }
    }

    try {
      // Delete subcategories first if any
      if (hasSubcategories) {
        const { error: subError } = await supabase
          .from('categories')
          .delete()
          .eq('parent_category_id', categoryId);

        if (subError) throw subError;
      }

      // Delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setAllCategories(allCategories.filter(cat => cat.id !== categoryId && cat.parent_category_id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category: ' + error.message);
    }
  }

  async function handleReorder(newOrder) {
    try {
      // Update all categories with new order
      const updates = newOrder.map((cat, index) => ({
        id: cat.id,
        order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }

      setCategories(newOrder);
    } catch (error) {
      console.error('Error reordering categories:', error);
      alert('Error reordering categories: ' + error.message);
      loadCategories(); // Reload on error
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem === null) {
      setDropIndex(null);
      setDropPosition(null);
      return;
    }

    // Don't show indicator on the item being dragged
    if (draggedItem === index) {
      setDropIndex(null);
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const elementMiddle = rect.top + rect.height / 2;
    
    // Determine if dropping above or below based on mouse position
    const position = mouseY < elementMiddle ? 'above' : 'below';
    
    // Calculate the final drop index
    let finalIndex;
    if (position === 'above') {
      // Dropping above this item
      finalIndex = index;
      // If dragging from below, adjust index
      if (draggedItem > index) {
        finalIndex = index;
      }
    } else {
      // Dropping below this item
      finalIndex = index + 1;
      // If dragging from above, adjust index
      if (draggedItem < index) {
        finalIndex = index + 1;
      }
    }
    
    setDropIndex(finalIndex);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) {
      setDropIndex(null);
      setDropPosition(null);
      setDraggedItem(null);
      return;
    }

    // Use dropIndex if set, otherwise use the index from the drop target
    const finalDropIndex = dropIndex !== null ? dropIndex : index;
    
    if (draggedItem === finalDropIndex) {
      setDropIndex(null);
      setDropPosition(null);
      setDraggedItem(null);
      return;
    }

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedItem, 1);
    newCategories.splice(finalDropIndex, 0, removed);

    handleReorder(newCategories);
    setDraggedItem(null);
    setDropIndex(null);
    setDropPosition(null);
  };

  if (!currentUser?.subspecialtyId) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Category Management</h2>
          <p className="text-gray-600 mb-6">Please select a subspecialty in your profile to manage categories.</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
            <p className="text-gray-600 text-sm mt-1">Add, rename, delete, and reorder categories and subcategories</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Add New Category */}
        <div className="mb-6 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Add New Category</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Category name..."
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategoryName.trim()}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCategory ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 mx-auto border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No categories yet. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={category.id} className="space-y-2">
                {/* Drop indicator line above this category */}
                {dropIndex === index && dropPosition === 'above' && draggedItem !== null && draggedItem !== index && (
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-4 shadow-lg animate-pulse"></div>
                )}
                
                {/* Category */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-4 bg-white rounded-xl border-2 transition-all ${
                    draggedItem === index 
                      ? 'opacity-50 border-purple-400 scale-95' 
                      : (dropIndex === index && dropPosition === 'above') || (dropIndex === index + 1 && dropPosition === 'below')
                      ? 'border-purple-400 shadow-md'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <GripVertical size={20} className="text-gray-400 cursor-move" />
                  
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleUpdateCategory(category.id, editingName)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateCategory(category.id, editingName);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-2 border-2 border-purple-500 rounded-lg focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-gray-900 font-medium">{category.name}</span>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setExpandedCategories({
                          ...expandedCategories,
                          [category.id]: !expandedCategories[category.id]
                        });
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title={expandedCategories[category.id] ? "Collapse" : "Expand"}
                    >
                      {expandedCategories[category.id] ? (
                        <span className="text-xs">▼</span>
                      ) : (
                        <span className="text-xs">▶</span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Drop indicator line below this category */}
                {dropIndex === index + 1 && dropPosition === 'below' && draggedItem !== null && draggedItem !== index && (
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-4 shadow-lg animate-pulse"></div>
                )}

                {/* Subcategories */}
                {expandedCategories[category.id] && (
                  <div className="ml-8 space-y-2">
                    {category.subcategories && category.subcategories.length > 0 && (
                      category.subcategories.map((subcategory, subIndex) => (
                        <div
                          key={subcategory.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="text-xs text-gray-400">└─</span>
                          {editingId === subcategory.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => handleUpdateCategory(subcategory.id, editingName)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateCategory(subcategory.id, editingName);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingName('');
                                }
                              }}
                              autoFocus
                              className="flex-1 px-3 py-2 border-2 border-purple-500 rounded-lg focus:outline-none text-sm"
                            />
                          ) : (
                            <span className="flex-1 text-gray-800 text-sm">{subcategory.name}</span>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(subcategory.id);
                                setEditingName(subcategory.name);
                              }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Rename"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(subcategory.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Subcategory Input */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubcategoryNames[category.id] || ''}
                          onChange={(e) => setNewSubcategoryNames({
                            ...newSubcategoryNames,
                            [category.id]: e.target.value
                          })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory(category.id)}
                          placeholder="Add subcategory..."
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddSubcategory(category.id)}
                          disabled={addingSubcategory[category.id] || !newSubcategoryNames[category.id]?.trim()}
                          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingSubcategory[category.id] ? '...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestedResourcesModal({ suggestions, onApprove, onReject, onClose, currentUser }) {
  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'article': return <FileText size={16} />;
      case 'link': return <Link size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'video': return 'from-red-500 to-pink-500';
      case 'article': return 'from-blue-500 to-cyan-500';
      case 'link': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Suggested Resources
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {pendingSuggestions.length} {pendingSuggestions.length === 1 ? 'resource' : 'resources'} pending review
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {pendingSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No pending suggestions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="glass rounded-xl p-4 sm:p-6 border-2 border-purple-200 dark:border-purple-800"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {suggestion.image_url ? (
                      <img
                        src={suggestion.image_url}
                        alt={suggestion.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <FileText size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r ${getTypeColor(suggestion.resource_type)} rounded-lg text-white text-xs font-medium`}>
                            {getTypeIcon(suggestion.resource_type)}
                            <span className="capitalize">{suggestion.resource_type}</span>
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {suggestion.description}
                        </p>
                        <a
                          href={suggestion.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm break-all flex items-center gap-1 mb-3"
                        >
                          <span>{suggestion.url}</span>
                          <ArrowRight size={14} />
                        </a>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Suggested by: {suggestion.suggested_by_profile?.email || 'Unknown'} • {formatDate(suggestion.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => onApprove(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsModal({ currentUser, darkMode, onDarkModeToggle, onUpdateProfile, onClose }) {
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentUser?.specialtyId || '');
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(currentUser?.subspecialtyId || '');
  const [loadingSubspecialties, setLoadingSubspecialties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSpecialties();
    // Initialize from currentUser
    if (currentUser?.specialtyId) {
      setSelectedSpecialty(String(currentUser.specialtyId));
      loadSubspecialties(currentUser.specialtyId);
      if (currentUser?.subspecialtyId) {
        setSelectedSubspecialty(String(currentUser.subspecialtyId));
      }
    } else {
      setSelectedSpecialty('');
      setSelectedSubspecialty('');
    }
  }, [currentUser]);

  async function loadSpecialties() {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('order');
    if (data) setSpecialties(data);
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) {
      setSubspecialties([]);
      return Promise.resolve();
    }
    setLoadingSubspecialties(true);
    try {
      const { data } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      setSubspecialties(data || []);
      // Clear subspecialty if it doesn't belong to new specialty
      if (selectedSubspecialty && data) {
        const exists = data.some(s => String(s.id) === String(selectedSubspecialty));
        if (!exists) {
          setSelectedSubspecialty('');
        }
      }
    } finally {
      setLoadingSubspecialties(false);
    }
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty('');
    loadSubspecialties(specialtyId);
  };

  async function handleSave() {
    if (!currentUser?.id) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const updateData = {};
      
      // Only allow surgeons and trainees to update specialty/subspecialty
      if (currentUser.userType === 'surgeon' || currentUser.userType === 'trainee') {
        if (selectedSpecialty) {
          updateData.primary_specialty_id = selectedSpecialty;
        }
        if (selectedSubspecialty) {
          updateData.primary_subspecialty_id = selectedSubspecialty;
        } else if (currentUser.userType === 'surgeon') {
          // Surgeons must have a subspecialty
          setMessage('Surgeons must select a subspecialty.');
          setSaving(false);
          return;
        }
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      setMessage('Settings saved successfully!');
      setTimeout(() => {
        onUpdateProfile(updateData);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Dark Mode</h3>
              <p className="text-sm text-gray-600">Toggle dark mode theme</p>
            </div>
            <button
              onClick={() => onDarkModeToggle(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Specialty/Subspecialty (only for surgeons and trainees) */}
        {(currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialty & Subspecialty</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specialty</label>
                  <select
                    value={selectedSpecialty || ''}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select Specialty</option>
                    {specialties.map(specialty => (
                      <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                    ))}
                  </select>
                </div>

                {selectedSpecialty && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subspecialty {currentUser?.userType === 'surgeon' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={selectedSubspecialty || ''}
                      onChange={(e) => setSelectedSubspecialty(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                      disabled={loadingSubspecialties}
                    >
                      <option value="">Select Subspecialty</option>
                      {subspecialties.map(subspecialty => (
                        <option key={subspecialty.id} value={subspecialty.id}>{subspecialty.name}</option>
                      ))}
                    </select>
                    {loadingSubspecialties && <p className="text-sm text-gray-500 mt-1">Loading subspecialties...</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {(currentUser?.userType === 'surgeon' || currentUser?.userType === 'trainee') && (
            <button
              onClick={handleSave}
              disabled={saving || (currentUser?.userType === 'surgeon' && !selectedSubspecialty)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SurgicalTechniquesApp;
