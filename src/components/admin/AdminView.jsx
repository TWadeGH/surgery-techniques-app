/**
 * AdminView Component
 * Main admin dashboard view with resources and analytics tabs
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useMemo, memo, lazy, Suspense } from 'react';
import { Sparkles, ArrowRight, BarChart3 } from 'lucide-react';
import { FullPageSpinner } from '../common/Spinner';

// Lazy load admin components for better initial load performance
const ResourcesManagement = lazy(() => import('./ResourcesManagement'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

/**
 * AdminView Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of resource objects
 * @param {string} props.adminTab - Current admin tab ('resources' or 'analytics')
 * @param {Function} props.setAdminTab - Callback to change admin tab
 * @param {Function} props.onAddResource - Callback to add resource
 * @param {Function} props.onEditResource - Callback to edit resource
 * @param {Function} props.onDeleteResource - Callback to delete resource
 * @param {Function} props.onEditCategories - Callback to edit categories
 * @param {Function} props.onReorderResources - Callback to reorder resources
 * @param {Object} props.currentUser - Current user object
 * @param {Array} props.suggestedResources - Array of suggested resource objects
 * @param {Function} props.onShowSuggestedResources - Callback to show suggested resources modal
 * @param {Function} props.onApproveSuggestion - Callback to approve suggestion
 * @param {Function} props.onRejectSuggestion - Callback to reject suggestion
 */
function AdminView({ 
  resources, 
  adminTab, 
  setAdminTab, 
  onAddResource, 
  onEditResource, 
  onDeleteResource, 
  onEditCategories, 
  onReorderResources, 
  currentUser, 
  suggestedResources, 
  onShowSuggestedResources, 
  onApproveSuggestion, 
  onRejectSuggestion 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize filtered resources for performance
  const filteredResources = useMemo(() => {
    if (!resources || !Array.isArray(resources)) return [];
    
    if (searchTerm === '') return resources;
    
    const searchLower = searchTerm.toLowerCase();
    return resources.filter(r => {
      if (!r) return false;
      return (r.title && r.title.toLowerCase().includes(searchLower)) ||
             (r.description && r.description.toLowerCase().includes(searchLower));
    });
  }, [resources, searchTerm]);

  // Memoize pending count
  const pendingCount = useMemo(() => {
    if (!suggestedResources || !Array.isArray(suggestedResources)) return 0;
    return suggestedResources.filter(s => s && s.status === 'pending').length;
  }, [suggestedResources]);

  return (
    <div className="animate-slide-up">
      {/* Suggested Resources Banner */}
      {pendingCount > 0 && (
        <div className="mb-6">
          <button
            onClick={onShowSuggestedResources}
            className="w-full glass rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all text-left group"
            aria-label={`View ${pendingCount} pending suggestions`}
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
          aria-label="Resources tab"
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
          aria-label="Analytics tab"
        >
          <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="hidden xs:inline">Analytics</span>
          <span className="xs:hidden">Stats</span>
        </button>
      </div>

      {/* Tab Content - Lazy loaded with Suspense */}
      {adminTab === 'resources' && (
        <Suspense fallback={<FullPageSpinner />}>
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
        </Suspense>
      )}

      {adminTab === 'analytics' && (
        <Suspense fallback={<FullPageSpinner />}>
          <AnalyticsDashboard resources={resources} />
        </Suspense>
      )}
    </div>
  );
}

// Memoize AdminView to prevent unnecessary re-renders
export default memo(AdminView);
