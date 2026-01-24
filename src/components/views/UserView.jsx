/**
 * UserView Component
 * Main user-facing view for browsing resources with categories and search
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Plus, Heart, GripVertical } from 'lucide-react';
import ResourceFilters from '../resources/ResourceFilters';
import ResourceList from '../resources/ResourceList';
import ResourceCard from '../resources/Resourcecard';
import { canRateOrFavorite } from '../../utils/helpers';

/**
 * UserView Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of resource objects
 * @param {Array} props.upcomingCases - Array of upcoming case objects
 * @param {boolean} props.showUpcomingCases - Whether to show upcoming cases view
 * @param {Function} props.onToggleUpcomingCases - Callback to toggle upcoming cases view
 * @param {boolean} props.showFavoritesOnly - Whether showing favorites only
 * @param {string} props.searchTerm - Current search term
 * @param {Array} props.categories - Array of category objects
 * @param {string} props.selectedCategoryId - Currently selected category ID
 * @param {Function} props.onToggleFavorites - Callback to toggle favorites filter
 * @param {Function} props.onSearchChange - Callback when search changes
 * @param {Function} props.onToggleFavorite - Callback to toggle favorite
 * @param {Function} props.onToggleUpcomingCase - Callback to toggle upcoming case
 * @param {Function} props.onReorderUpcomingCases - Callback to reorder upcoming cases
 * @param {Function} props.onUpdateNote - Callback to update note
 * @param {Function} props.onSuggestResource - Callback to suggest resource
 * @param {Function} props.onCategorySelect - Callback when category is selected
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.isFavorited - Function to check if resource is favorited
 * @param {Function} props.getNote - Function to get note for resource
 * @param {Function} props.isInUpcomingCases - Function to check if resource is in upcoming cases
 */
function UserView({ 
  resources, 
  upcomingCases, 
  showUpcomingCases, 
  onToggleUpcomingCases, 
  showFavoritesOnly, 
  searchTerm, 
  categories, 
  selectedCategoryId, 
  onToggleFavorites, 
  onSearchChange, 
  onToggleFavorite, 
  onToggleUpcomingCase, 
  onReorderUpcomingCases, 
  onUpdateNote, 
  onSuggestResource, 
  onCategorySelect, 
  currentUser, 
  isFavorited, 
  getNote, 
  isInUpcomingCases 
}) {
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

  // Handle drag and drop for upcoming cases (memoized)
  const handleUpcomingCaseDragStart = useCallback((e, caseId) => {
    setDraggedUpcomingCaseId(caseId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleUpcomingCaseDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleUpcomingCaseDrop = useCallback((e, targetCaseId) => {
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
  }, [draggedUpcomingCaseId, upcomingCases, onReorderUpcomingCases]);

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
          {canRateOrFavorite(currentUser) && (
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
                          aria-label={expandedCategories[category.id] ? 'Collapse' : 'Expand'}
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
          <ResourceFilters
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            placeholder="Search resources..."
          />

          {/* Resources List */}
          <ResourceList
            resources={resources}
            favorites={[]} // Not used - hooks provide isFavorited function
            notes={{}} // Not used - hooks provide getNote function
            upcomingCases={upcomingCases}
            onToggleFavorite={onToggleFavorite}
            onUpdateNote={onUpdateNote}
            onToggleUpcomingCase={onToggleUpcomingCase}
            currentUser={currentUser}
            showFavoritesOnly={showFavoritesOnly}
            isFavorited={isFavorited}
            getNote={getNote}
          />
        </div>
      </div>
    </div>
  );
}

// Memoize UserView to prevent unnecessary re-renders
export default memo(UserView);
