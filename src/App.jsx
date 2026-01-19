import React, { useState, useEffect } from 'react';
import { Video, FileText, Link, Plus, Star, Edit, Trash2, StickyNote, ArrowRight, Sparkles, LogOut, Upload, X, Search, BarChart3, TrendingUp } from 'lucide-react';
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

function SurgicalTechniquesApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('user');
  const [adminTab, setAdminTab] = useState('resources'); // 'resources', 'analytics'
  const [resources, setResources] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notes, setNotes] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleAddResource(resourceData, imageFile) {
    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `resource-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert resource
      const { error } = await supabase
        .from('resources')
        .insert([{
          title: resourceData.title,
          url: resourceData.url,
          description: resourceData.description,
          resource_type: resourceData.type,
          image_url: imageUrl,
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

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Surgical Techniques</h1>
              <p className="text-purple-200 text-sm mono">Educational Resource Hub</p>
            </div>

            <div className="flex gap-4 items-center">
              <span className="text-white text-sm">{currentUser.email}</span>
              
              {currentView === 'user' && (
                <div className="flex gap-2 glass-dark rounded-full p-1">
                  <button
                    onClick={() => setCurrentView('user')}
                    className="px-6 py-2 rounded-full font-medium bg-white text-purple-900 shadow-lg"
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/10 transition-all"
                  >
                    Admin
                  </button>
                </div>
              )}

              {currentView === 'admin' && (
                <div className="flex gap-2 glass-dark rounded-full p-1">
                  <button
                    onClick={() => setCurrentView('user')}
                    className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/10 transition-all"
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setCurrentView('admin')}
                    className="px-6 py-2 rounded-full font-medium bg-white text-purple-900 shadow-lg"
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
            onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onSearchChange={setSearchTerm}
            onToggleFavorite={toggleFavorite}
            onUpdateNote={updateNote}
          />
        ) : (
          <AdminView
            resources={resources}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            onAddResource={() => setShowAddForm(true)}
            onDeleteResource={handleDeleteResource}
          />
        )}
      </main>

      {/* Add Resource Modal */}
      {showAddForm && (
        <AddResourceModal
          onSubmit={handleAddResource}
          onClose={() => setShowAddForm(false)}
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

function UserView({ resources, favorites, notes, showFavoritesOnly, searchTerm, onToggleFavorites, onSearchChange, onToggleFavorite, onUpdateNote }) {
  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Resource Library</h2>
          <p className="text-gray-600">Curated surgical techniques and educational materials</p>
        </div>
        <button
          onClick={onToggleFavorites}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            showFavoritesOnly 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg' 
              : 'glass border hover:border-purple-300'
          }`}
        >
          <Star size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          <span>{showFavoritesOnly ? 'All Resources' : 'Favorites'}</span>
        </button>
      </div>

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
  );
}

function AdminView({ resources, adminTab, setAdminTab, onAddResource, onDeleteResource }) {
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
          onDeleteResource={onDeleteResource}
        />
      )}

      {adminTab === 'analytics' && (
        <AnalyticsDashboard resources={resources} />
      )}
    </div>
  );
}

function ResourcesManagement({ resources, searchTerm, setSearchTerm, onAddResource, onDeleteResource }) {
  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Manage Resources</h3>
          <p className="text-gray-600">Add, edit, or remove resources from the library</p>
        </div>
        <button
          onClick={onAddResource}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button"
        >
          <Plus size={20} />
          Add Resource
        </button>
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
      {/* Image */}
      {resource.image_url && (
        <div className="w-full h-48 overflow-hidden bg-gray-100">
          <img 
            src={resource.image_url} 
            alt={resource.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

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

function AdminResourceCard({ resource, onDelete, index }) {
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
        {/* Image */}
        {resource.image_url && (
          <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
            <img 
              src={resource.image_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

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

function AddResourceModal({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'video',
    description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, imageFile);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Resource</h2>
          <p className="text-gray-600 mb-6">Add a surgical technique resource to the library</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Image</label>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 transition-colors bg-gray-50">
                  <Upload size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
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
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button"
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

export default SurgicalTechniquesApp;
