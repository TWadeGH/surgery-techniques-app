import React, { useState, useEffect, useMemo } from 'react';
import { Video, FileText, Link, Plus, Star, Edit, Trash2, StickyNote, ArrowRight, Sparkles, LogOut, Upload, X, Search, BarChart3, TrendingUp, GripVertical } from 'lucide-react';
import { supabase } from './lib/supabase';
import { 
  initAnalyticsSession, 
  trackResourceView, 
  trackResourceViewEnd, 
  trackFavoriteEvent, 
  trackUnfavoriteEvent,
  trackResourceCoview,
  endAnalyticsSession 
} from './lib/analytics';
import { processResourceImage, createImagePreview, validateImageFile } from './lib/imageUtils';

function SurgicalTechniquesApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('user');
  const [adminTab, setAdminTab] = useState('resources'); // 'resources', 'analytics'
  const [resources, setResources] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notes, setNotes] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [procedures, setProcedures] = useState([]); // For filtering resources by category

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setLoading(false);
    }
  }

  async function loadUserProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const userData = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        specialtyId: profile.primary_specialty_id,
        subspecialtyId: profile.primary_subspecialty_id
      };

      setCurrentUser(userData);
      
      // Initialize analytics session
      initAnalyticsSession(userData.id, {
        specialtyId: userData.specialtyId,
        subspecialtyId: userData.subspecialtyId,
        experienceBucket: '6-10', // TODO: Add to profile
        practiceType: 'private', // TODO: Add to profile
        region: 'west' // TODO: Add to profile
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  }

  async function loadAllData() {
    try {
      // Load resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      // Load user favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('resource_id')
        .eq('user_id', currentUser.id);

      // Load user notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.id);

      setResources(resourcesData || []);
      setFavorites(favoritesData?.map(f => f.resource_id) || []);
      
      // Convert notes array to object
      const notesObj = {};
      notesData?.forEach(note => {
        notesObj[note.resource_id] = note.note_text;
      });
      setNotes(notesObj);

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

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleAddResource(resourceData, imageFile) {
    try {
      if (!imageFile) {
        alert('Image is required');
        return;
      }

      // Process image (resize and compress)
      const processedImage = await processResourceImage(imageFile);
      
      // Upload processed image
      const fileName = `resource-${Date.now()}.webp`;
      const filePath = `resource-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, processedImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      // Insert resource
      const { error } = await supabase
        .from('resources')
        .insert([{
          procedure_id: resourceData.procedure_id,
          title: resourceData.title,
          url: resourceData.url,
          description: resourceData.description,
          resource_type: resourceData.type,
          image_url: imageUrl,
          keywords: resourceData.keywords || null,
          curated_by: currentUser.id,
          is_sponsored: false
        }]);

      if (error) throw error;

      setShowAddForm(false);
      loadAllData();
      alert('Resource added successfully!');
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('Error adding resource: ' + error.message);
    }
  }

  async function handleSuggestResource(resourceData, imageFile) {
    try {
      if (!imageFile) {
        alert('Image is required');
        return;
      }

      if (!resourceData.procedure_id) {
        alert('Please select a procedure');
        return;
      }

      // Process image (resize and compress)
      const processedImage = await processResourceImage(imageFile);
      
      // Upload processed image
      const fileName = `suggestion-${Date.now()}.webp`;
      const filePath = `resource-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, processedImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      // Insert suggestion
      const { error } = await supabase
        .from('resource_suggestions')
        .insert([{
          procedure_id: resourceData.procedure_id,
          title: resourceData.title,
          url: resourceData.url,
          description: resourceData.description,
          resource_type: resourceData.type || 'video',
          image_url: imageUrl,
          keywords: resourceData.keywords || null,
          suggested_by: currentUser.id,
          status: 'pending'
        }]);

      if (error) throw error;

      setShowSuggestForm(false);
      alert('Resource suggestion submitted successfully! It will be reviewed by an admin.');
    } catch (error) {
      console.error('Error suggesting resource:', error);
      alert('Error submitting suggestion: ' + error.message);
    }
  }

  async function handleEditResource(resourceId, resourceData, imageFile) {
    try {
      let imageUrl = resourceData.image_url; // Use the image_url from resourceData (handles removal)

      // If new image provided, upload it (it's already processed in the modal)
      if (imageFile) {
        // imageFile is already processed, so upload it directly
        const fileName = `resource-${Date.now()}.webp`;
        const filePath = `resource-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }
      // If imageFile is null and resourceData.image_url is null, imageUrl stays null (removed)

      // Update resource
      const { error } = await supabase
        .from('resources')
        .update({
          title: resourceData.title,
          url: resourceData.url,
          description: resourceData.description,
          resource_type: resourceData.type,
          image_url: imageUrl,
          keywords: resourceData.keywords || null,
        })
        .eq('id', resourceId);

      if (error) throw error;

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

  async function toggleFavorite(resourceId) {
    try {
      const isFavorited = favorites.includes(resourceId);

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('resource_id', resourceId);

        if (error) throw error;
        setFavorites(favorites.filter(id => id !== resourceId));
        
        // Track unfavorite event
        trackUnfavoriteEvent(resourceId, currentUser.id);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{
            user_id: currentUser.id,
            resource_id: resourceId
          }]);

        if (error) throw error;
        setFavorites([...favorites, resourceId]);
        
        // Track favorite event (GOLD for analytics)
        trackFavoriteEvent(resourceId, currentUser.id);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async function updateNote(resourceId, noteText) {
    try {
      if (!noteText || noteText.trim() === '') {
        // Delete note if empty
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('resource_id', resourceId);

        if (error) throw error;

        const newNotes = { ...notes };
        delete newNotes[resourceId];
        setNotes(newNotes);
      } else {
        // Check if note exists
        const { data: existing } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('resource_id', resourceId)
          .single();

        if (existing) {
          // Update existing note
          const { error } = await supabase
            .from('notes')
            .update({ note_text: noteText, updated_at: new Date().toISOString() })
            .eq('user_id', currentUser.id)
            .eq('resource_id', resourceId);

          if (error) throw error;
        } else {
          // Insert new note
          const { error } = await supabase
            .from('notes')
            .insert([{
              user_id: currentUser.id,
              resource_id: resourceId,
              note_text: noteText
            }]);

          if (error) throw error;
        }

        setNotes({ ...notes, [resourceId]: noteText });
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  }

  // Sort resources: sponsored > favorites > regular
  const sortResources = (resources) => {
    return [...resources].sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      return 0;
    });
  };

  // Filter resources
  const getFilteredResources = () => {
    let filtered = resources;

    if (showFavoritesOnly) {
      filtered = filtered.filter(r => favorites.includes(r.id));
    }

    // Filter by category (via procedures)
    if (selectedCategoryId) {
      // Get all category IDs to include (category + its subcategories)
      const categoryIds = [selectedCategoryId];
      const subcategoryIds = categories
        .filter(c => c.parent_category_id === selectedCategoryId)
        .map(c => c.id);
      const allCategoryIds = [...categoryIds, ...subcategoryIds];

      // Get procedure IDs for these categories
      const procedureIds = procedures
        .filter(p => allCategoryIds.includes(p.category_id))
        .map(p => p.id);

      // Filter resources by procedure IDs
      filtered = filtered.filter(r => 
        r.procedure_id && procedureIds.includes(r.procedure_id)
      );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={checkUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              
              {currentView === 'user' && (
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

              {currentView === 'admin' && (
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

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setCurrentUser(null);
                }}
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
      <main className="max-w-7xl mx-auto px-6 py-12">
        {currentView === 'user' ? (
          <UserView 
            resources={displayedResources}
            favorites={favorites}
            notes={notes}
            showFavoritesOnly={showFavoritesOnly}
            searchTerm={searchTerm}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onSearchChange={setSearchTerm}
            onToggleFavorite={toggleFavorite}
            onUpdateNote={updateNote}
            onSuggestResource={() => setShowSuggestForm(true)}
            onCategorySelect={setSelectedCategoryId}
          />
        ) : (
          <AdminView
            resources={resources}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            onAddResource={() => setShowAddForm(true)}
            onEditResource={(resource) => setEditingResource(resource)}
            onDeleteResource={handleDeleteResource}
            onEditCategories={() => setShowCategoryManagement(true)}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Add Resource Modal */}
      {showAddForm && (
        <AddResourceModal
          currentUser={currentUser}
          onSubmit={handleAddResource}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Suggest Resource Modal */}
      {showSuggestForm && (
        <SuggestResourceModal
          currentUser={currentUser}
          onSubmit={handleSuggestResource}
          onClose={() => setShowSuggestForm(false)}
        />
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <EditResourceModal
          resource={editingResource}
          onSubmit={(resourceData, imageFile) => handleEditResource(editingResource.id, resourceData, imageFile)}
          onClose={() => setEditingResource(null)}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryManagement && (
        <CategoryManagementModal
          currentUser={currentUser}
          onClose={() => {
            setShowCategoryManagement(false);
            // Reload categories after closing modal
            if (currentUser?.subspecialtyId) {
              supabase
                .from('categories')
                .select('*')
                .eq('subspecialty_id', currentUser.subspecialtyId)
                .order('order')
                .then(({ data }) => {
                  if (data) {
                    setCategories(data);
                    // Also reload procedures for filtering
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
    </div>
  );
}

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Surgical Techniques</h1>
        <p className="text-gray-600 mb-8">Sign in to access the resource library</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
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

function UserView({ resources, favorites, notes, showFavoritesOnly, searchTerm, categories, selectedCategoryId, onToggleFavorites, onSearchChange, onToggleFavorite, onUpdateNote, onSuggestResource, onCategorySelect }) {
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
          <button
            onClick={onToggleFavorites}
            className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
              showFavoritesOnly 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg' 
                : 'glass border hover:border-purple-300'
            }`}
          >
            <Star size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            <span>{showFavoritesOnly ? 'All Resources' : 'Favorites'}</span>
          </button>
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
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.length === 0 ? (
          <div className="col-span-full glass rounded-2xl p-16 text-center shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <FileText size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {showFavoritesOnly ? 'No favorites yet' : 'No resources found'}
              </h3>
              <p className="text-gray-600">
                {showFavoritesOnly 
                  ? 'Star some resources to see them here!' 
                  : 'Try adjusting your search or check back later!'}
              </p>
            </div>
          </div>
        ) : (
          resources.map((resource, index) => (
            <ResourceCard 
              key={resource.id} 
              resource={resource}
              isFavorited={favorites.includes(resource.id)}
              note={notes[resource.id]}
              onToggleFavorite={onToggleFavorite}
              onUpdateNote={onUpdateNote}
              index={index}
            />
          ))
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminView({ resources, adminTab, setAdminTab, onAddResource, onEditResource, onDeleteResource, onEditCategories, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResources = resources.filter(r => 
    searchTerm === '' || 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
        <p className="text-gray-600">Manage content and view insights</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-2 mb-8 shadow-lg inline-flex gap-2">
        <button
          onClick={() => setAdminTab('resources')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            adminTab === 'resources' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setAdminTab('analytics')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            adminTab === 'analytics' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 size={18} />
          Analytics
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
        />
      )}

      {adminTab === 'analytics' && (
        <AnalyticsDashboard resources={resources} />
      )}
    </div>
  );
}

function ResourcesManagement({ resources, searchTerm, setSearchTerm, onAddResource, onEditResource, onDeleteResource, onEditCategories }) {
  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Manage Resources</h3>
          <p className="text-gray-600">Add, edit, or remove resources from the library</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEditCategories}
            className="flex items-center gap-2 px-5 py-3 glass border-2 border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors"
          >
            <Edit size={20} />
            Edit Categories
          </button>
          <button
            onClick={onAddResource}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button"
          >
            <Plus size={20} />
            Add Resource
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-6 mb-6 shadow-lg">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600">Click "Add Resource" to get started!</p>
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
            <h4 className="text-sm font-semibold text-gray-600">Total Views (30d)</h4>
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
          <p className="text-sm text-gray-500 mt-1">Across all resources</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">Total Favorites</h4>
            <Star size={20} className="text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalFavorites}</p>
          <p className="text-sm text-gray-500 mt-1">Learning signals</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-600">Avg Time Spent</h4>
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgEngagement.toFixed(1)}m</p>
          <p className="text-sm text-gray-500 mt-1">Per resource view</p>
        </div>
      </div>

      {/* Top Resources */}
      <div className="glass rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Top Resources (Last 30 Days)</h3>
        <div className="space-y-3">
          {topResources.map((resource, index) => (
            <div key={resource.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{resource.title}</h4>
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

function ResourceCard({ resource, isFavorited, note, onToggleFavorite, onUpdateNote, index }) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const [viewTracked, setViewTracked] = useState(false);

  // Track view when card is visible
  useEffect(() => {
    if (!viewTracked && resource.id) {
      trackResourceCoview(resource.id);
      setViewTracked(true);
    }
  }, [resource.id, viewTracked]);

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

  return (
    <div 
      className={`glass rounded-2xl overflow-hidden shadow-lg card-hover animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Image - Always shown (required field) */}
      <div className="w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
        {resource.image_url ? (
          <img 
            src={resource.image_url} 
            alt={resource.title}
            className="w-full h-full object-cover"
            style={{ aspectRatio: '1/1', width: '100%', height: 'auto' }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center" style={{ aspectRatio: '1/1' }}>
            <FileText size={32} className="text-gray-400" />
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Sponsored Badge */}
        {resource.is_sponsored && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs font-medium mb-3">
            <Sparkles size={12} />
            <span className="mono">Sponsored</span>
          </div>
        )}

        {/* Type Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getTypeColor()} text-white text-sm font-medium mb-4`}>
          {getTypeIcon()}
          <span className="capitalize">{getTypeLabel()}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight">{resource.title}</h3>
        
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{resource.description}</p>

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
                className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors group"
          >
            <span>View Resource</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`p-2.5 rounded-lg transition-all ${
                note 
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={note ? 'Edit note' : 'Add note'}
            >
              <StickyNote size={18} fill={note ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onToggleFavorite(resource.id)}
              className={`p-2.5 rounded-lg transition-all ${
                isFavorited 
                  ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminResourceCard({ resource, onEdit, onDelete, index }) {
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
      className={`glass rounded-2xl p-6 shadow-lg card-hover animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex gap-6">
        {/* Image - Uniform 1:1 aspect ratio (square) */}
        <div className="w-48 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
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
              <FileText size={24} className="text-gray-400" />
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
            </div>
          </div>

          <h4 className="font-bold text-xl text-gray-900 mb-2">{resource.title}</h4>
          <p className="text-gray-600 mb-3">{resource.description}</p>
          
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-600 hover:text-purple-700 text-sm break-all flex items-center gap-1 mb-4"
          >
            <span>{resource.url}</span>
            <ArrowRight size={14} />
          </a>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(resource)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
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
    procedure_id: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Specialty/Subspecialty/Category/Procedure selection
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [canEditSpecialty, setCanEditSpecialty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Initialize with user's specialty/subspecialty
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedSpecialty) {
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);

  useEffect(() => {
    if (selectedCategory) {
      loadProcedures(selectedCategory);
    }
  }, [selectedCategory]);

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
        setSelectedSpecialty(String(currentUser.specialtyId));
        
        // Load subspecialties for this specialty
        const { data: subspecialtiesData, error: subspecialtiesError } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        
        if (subspecialtiesError) {
          throw new Error(`Failed to load subspecialties: ${subspecialtiesError.message}`);
        }
        
        setSubspecialties(subspecialtiesData || []);
        
        if (currentUser?.subspecialtyId) {
          setSelectedSubspecialty(String(currentUser.subspecialtyId));
          
          // Load categories for the subspecialty
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
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setImageError(`Error loading form data: ${errorMessage}`);
      alert(`Error loading form data:\n\n${errorMessage}\n\nPlease check the browser console for more details.`);
    } finally {
      setLoadingData(false);
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
      setSelectedProcedure(null);
      setFormData(prev => ({ ...prev, procedure_id: '' }));
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
    // Clear procedure when category changes
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
  }

  async function loadProcedures(categoryId) {
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    
    setProcedures(data || []);
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
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
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
    loadProcedures(categoryId);
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
      loadProcedures(data.id);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }

  const handleProcedureChange = (procedureId) => {
    setSelectedProcedure(procedureId);
    setFormData(prev => ({ ...prev, procedure_id: procedureId }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      setImageError('Image is required');
      return;
    }

    if (!selectedProcedure) {
      alert('Please select a procedure');
      return;
    }

    setImageError('');
    onSubmit(formData, imageFile);
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
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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

            {/* Procedure Selection */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Procedure *</label>
                <select
                  required
                  value={selectedProcedure || ''}
                  onChange={(e) => handleProcedureChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="">Select procedure...</option>
                  {procedures.map(proc => (
                    <option key={proc.id} value={proc.id}>{proc.name}</option>
                  ))}
                </select>
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
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

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
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedProcedure || !imageFile}
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
    procedure_id: '',
    title: '',
    url: '',
    type: 'video',
    description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Specialty/Subspecialty/Category/Procedure selection
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [canEditSpecialty, setCanEditSpecialty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Initialize with user's specialty/subspecialty
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedSpecialty) {
      // Load subspecialties when specialty is selected
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);

  useEffect(() => {
    if (selectedCategory) {
      loadProcedures(selectedCategory);
    }
  }, [selectedCategory]);

  async function loadInitialData() {
    try {
      setLoadingData(true);
      // Load all specialties
      const { data: specialtiesData } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      
      setSpecialties(specialtiesData || []);

      // Pre-populate with user's specialty/subspecialty if available
      if (currentUser?.specialtyId) {
        setSelectedSpecialty(String(currentUser.specialtyId));
        
        // Load subspecialties for this specialty
        const { data: subspecialtiesData } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        
        setSubspecialties(subspecialtiesData || []);
        
        if (currentUser?.subspecialtyId) {
          setSelectedSubspecialty(String(currentUser.subspecialtyId));
          
          // Load categories for the subspecialty
          const { data: categoriesData } = await supabase
            .from('categories')
            .select('*')
            .eq('subspecialty_id', currentUser.subspecialtyId)
            .is('parent_category_id', null)
            .order('order');
          
          setCategories(categoriesData || []);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setImageError('Error loading form data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }

  async function loadSubspecialties(specialtyId) {
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order');
    
    setSubspecialties(data || []);
    // Clear category/procedure when specialty changes
    setSelectedCategory(null);
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
  }

  async function loadCategories(subspecialtyId) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null) // Top-level categories only for now
      .order('order');
    
    setCategories(data || []);
    // Clear procedure when category changes
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
  }

  async function loadProcedures(categoryId) {
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    
    setProcedures(data || []);
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
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
    setSelectedProcedure(null);
    setFormData(prev => ({ ...prev, procedure_id: '' }));
    loadProcedures(categoryId);
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
      loadProcedures(data.id);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }

  const handleProcedureChange = (procedureId) => {
    setSelectedProcedure(procedureId);
    setFormData(prev => ({ ...prev, procedure_id: procedureId }));
  };

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

    if (!selectedProcedure) {
      alert('Please select a procedure');
      return;
    }

    setImageError('');
    setSubmitting(true);
    
    try {
      // Make sure procedure_id is set in formData
      const submitData = {
        ...formData,
        procedure_id: selectedProcedure
      };
      await onSubmit(submitData, imageFile);
      // Reset form
      setFormData({
        procedure_id: '',
        title: '',
        url: '',
        type: 'video',
        description: ''
      });
      setImageFile(null);
      setImagePreview(null);
      setSelectedProcedure(null);
      setSelectedCategory(null);
      setSelectedSubspecialty(null);
      setSelectedSpecialty(null);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
    } finally {
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
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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

            {/* Procedure Selection */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Procedure *</label>
                <select
                  required
                  value={selectedProcedure || ''}
                  onChange={(e) => handleProcedureChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="">Select procedure...</option>
                  {procedures.map(proc => (
                    <option key={proc.id} value={proc.id}>{proc.name}</option>
                  ))}
                </select>
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
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

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
                disabled={submitting || !imageFile || !selectedProcedure}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditResourceModal({ resource, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: resource.title || '',
    url: resource.url || '',
    type: resource.resource_type || 'video',
    description: resource.description || '',
    keywords: resource.keywords || ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize preview with existing image if available
  useEffect(() => {
    if (resource.image_url && !imagePreview && !imageFile) {
      setImagePreview(resource.image_url);
    }
  }, [resource.image_url]);

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
      
      const resourceData = {
        ...formData,
        image_url: imageUrl
      };
      
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
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

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
                disabled={submitting}
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

export default SurgicalTechniquesApp;
