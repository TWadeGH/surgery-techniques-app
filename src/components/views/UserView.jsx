/**
 * UserView Component
 * Main user-facing view for browsing resources with categories and search
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Plus, Heart, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import ResourceFilters from '../resources/ResourceFilters';
import ResourceList from '../resources/ResourceList';
import ResourceCard from '../resources/Resourcecard';
import { canRateOrFavorite } from '../../utils/helpers';

/**
 * UserView Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of filtered resource objects (for browsing)
 * @param {Array} props.allResources - Array of all resource objects (for upcoming cases)
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
 * @param {Array} props.availableSubspecialties - Array of available subspecialties for browsing
 * @param {string|null} props.browsingSubspecialtyId - Currently selected browsing subspecialty ID (null = use profile)
 * @param {Function} props.onBrowsingSubspecialtyChange - Callback when browsing subspecialty changes
 * @param {number} props.paginationTotal - Total number of resources (for pagination)
 * @param {number} props.paginationPage - Current page (1-based)
 * @param {number} props.paginationTotalPages - Total number of pages
 * @param {Function} props.onPaginationPrevious - Callback for Previous
 * @param {Function} props.onPaginationNext - Callback for Next
 */
function UserView({ 
  resources, 
  allResources,
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
  isInUpcomingCases,
  availableSubspecialties = [],
  browsingSubspecialtyId = null,
  onBrowsingSubspecialtyChange,
  paginationTotal = 0,
  paginationPage = 1,
  paginationTotalPages = 1,
  onPaginationPrevious,
  onPaginationNext,
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
  const [dragOverResourceId, setDragOverResourceId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'above' or 'below'
  const [upcomingCasesCategoryFilter, setUpcomingCasesCategoryFilter] = useState(null); // Category filter for upcoming cases

  // Get resources for upcoming cases (ordered) - use ALL resources, not filtered ones
  // Security: Uses resource_id for identification (prevent IDOR)
  const upcomingCaseResources = useMemo(() => {
    if (!showUpcomingCases || !upcomingCases.length) return [];
    const sortedCases = [...upcomingCases].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let resourcesToUse = (allResources || resources || []); // Fallback to resources if allResources not provided
    
    // Filter by category if selected
    if (upcomingCasesCategoryFilter) {
      resourcesToUse = resourcesToUse.filter(r => 
        r.category_id === upcomingCasesCategoryFilter || 
        r.subcategory_id === upcomingCasesCategoryFilter
      );
    }
    
    return sortedCases.map(uc => {
      const resource = resourcesToUse.find(r => r.id === uc.resource_id);
      return resource ? { ...resource, upcomingCaseResourceId: uc.resource_id } : null;
    }).filter(Boolean);
  }, [showUpcomingCases, upcomingCases, allResources, resources, upcomingCasesCategoryFilter]);

  // Handle drag and drop for upcoming cases (memoized)
  // Security: Uses resource_id for identification (prevent IDOR)
  const handleUpcomingCaseDragStart = useCallback((e, resourceId) => {
    // Security: Validate resourceId
    if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
      e.preventDefault();
      return;
    }
    setDraggedUpcomingCaseId(resourceId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', resourceId); // Set data for drag
    // Prevent child elements from interfering
    e.stopPropagation();
  }, []);

  const handleUpcomingCaseDragOver = useCallback((e, targetResourceId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
    
    // Security: Validate resourceId
    if (!targetResourceId || typeof targetResourceId !== 'string' || targetResourceId.length > 100) {
      return;
    }
    
    // Determine if drop is above or below based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const elementCenterY = rect.top + rect.height / 2;
    const position = mouseY < elementCenterY ? 'above' : 'below';
    
    setDragOverResourceId(targetResourceId);
    setDragOverPosition(position);
  }, []);

  const handleUpcomingCaseDragEnd = useCallback((e) => {
    // Clean up drag state
    setDraggedUpcomingCaseId(null);
    setDragOverResourceId(null);
    setDragOverPosition(null);
    e.stopPropagation();
  }, []);

  const handleUpcomingCaseDrop = useCallback(async (e, targetResourceId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Security: Validate resourceIds (prevent IDOR, type confusion)
    if (!draggedUpcomingCaseId || !targetResourceId || 
        typeof draggedUpcomingCaseId !== 'string' || typeof targetResourceId !== 'string' ||
        draggedUpcomingCaseId.length > 100 || targetResourceId.length > 100 ||
        draggedUpcomingCaseId === targetResourceId) {
      setDraggedUpcomingCaseId(null);
      setDragOverResourceId(null);
      setDragOverPosition(null);
      return;
    }

    // Find indices in the sorted upcoming cases array
    const sortedCases = [...upcomingCases].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const draggedIndex = sortedCases.findIndex(uc => uc.resource_id === draggedUpcomingCaseId);
    const targetIndex = sortedCases.findIndex(uc => uc.resource_id === targetResourceId);

    console.log('🔵 Drop handler:', {
      draggedUpcomingCaseId: draggedUpcomingCaseId?.substring(0, 8),
      targetResourceId: targetResourceId?.substring(0, 8),
      draggedIndex,
      targetIndex,
      dragOverPosition,
      sortedCasesLength: sortedCases.length
    });

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('🔴 Invalid indices:', { draggedIndex, targetIndex });
      setDraggedUpcomingCaseId(null);
      setDragOverResourceId(null);
      setDragOverPosition(null);
      return;
    }

    // Calculate destination index based on drop position
    // reorderCases removes from sourceIndex, then inserts at destinationIndex
    // The destinationIndex should be calculated as if the item is already removed
    let destinationIndex;
    if (dragOverPosition === 'above') {
      // Insert before target
      if (draggedIndex < targetIndex) {
        // Dragging down: after removal, target shifts left by 1
        destinationIndex = targetIndex - 1;
      } else {
        // Dragging up: target index stays the same
        destinationIndex = targetIndex;
      }
    } else {
      // Insert after target
      if (draggedIndex < targetIndex) {
        // Dragging down: after removal, target shifts left by 1, so insert at targetIndex
        destinationIndex = targetIndex;
      } else {
        // Dragging up: insert at targetIndex + 1
        destinationIndex = targetIndex + 1;
      }
    }

    // Call reorderCases with source and destination indices
    console.log('🔵 Calling onReorderUpcomingCases with:', draggedIndex, destinationIndex);
    try {
      const result = await onReorderUpcomingCases(draggedIndex, destinationIndex);
      console.log('🔵 Reorder result:', result);
    } catch (err) {
      console.error('🔴 Reorder error:', err);
    }
    
    setDraggedUpcomingCaseId(null);
    setDragOverResourceId(null);
    setDragOverPosition(null);
  }, [draggedUpcomingCaseId, dragOverPosition, upcomingCases, onReorderUpcomingCases]);

  // Handle move up/down with arrow buttons
  // Security: Validates resourceId and indices (prevent IDOR, type confusion)
  const handleMoveUp = useCallback(async (resourceId, currentIndex) => {
    // Security: Validate resourceId
    if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
      return;
    }
    
    if (currentIndex <= 0) return; // Already at top
    
    console.log('🔵 Moving up:', currentIndex, '->', currentIndex - 1);
    
    // Move item up (decrease index)
    try {
      const result = await onReorderUpcomingCases(currentIndex, currentIndex - 1);
      console.log('🔵 Move up result:', result);
    } catch (err) {
      console.error('🔴 Move up error:', err);
    }
  }, [onReorderUpcomingCases]);

  const handleMoveDown = useCallback(async (resourceId, currentIndex) => {
    // Security: Validate resourceId
    if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
      return;
    }
    
    // upcomingCaseResources is already sorted, so use its length
    if (currentIndex >= upcomingCaseResources.length - 1) return; // Already at bottom
    
    console.log('🔵 Moving down:', currentIndex, '->', currentIndex + 1);
    
    // Move item down (increase index)
    const result = await onReorderUpcomingCases(currentIndex, currentIndex + 1);
    console.log('🔵 Move down result:', result);
  }, [upcomingCaseResources.length, onReorderUpcomingCases]);

  // Show upcoming cases view if toggled
  if (showUpcomingCases) {
    return (
      <div className="animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upcoming Cases</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Drag and drop to reorder your resources</p>
          </div>
          <button
            onClick={onToggleUpcomingCases}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all glass border hover:border-purple-300 text-purple-700 hover:bg-purple-50 text-sm sm:text-base"
          >
            Back to Browse
          </button>
        </div>

        {/* Category Filter for Upcoming Cases */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setUpcomingCasesCategoryFilter(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                upcomingCasesCategoryFilter === null
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-300 dark:border-gray-600'
              }`}
            >
              All Categories
            </button>
            {organizedCategories.map((category) => (
              <React.Fragment key={category.id}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUpcomingCasesCategoryFilter(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      upcomingCasesCategoryFilter === category.id
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {category.name}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCategories(prev => ({
                            ...prev,
                            [category.id]: !prev[category.id]
                          }));
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-1"
                        aria-label={expandedCategories[category.id] ? 'Collapse' : 'Expand'}
                      >
                        {expandedCategories[category.id] ? '▼' : '▶'}
                      </button>
                    )}
                  </button>
                </div>
                {category.subcategories && category.subcategories.length > 0 && expandedCategories[category.id] && (
                  <div className="flex flex-wrap gap-2 ml-6">
                    {category.subcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => setUpcomingCasesCategoryFilter(subcategory.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          upcomingCasesCategoryFilter === subcategory.id
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {upcomingCaseResources.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-300 text-lg mb-2">
              {upcomingCasesCategoryFilter 
                ? 'No upcoming cases in this category' 
                : 'No upcoming cases yet'}
            </p>
            <p className="text-gray-400 dark:text-gray-400 text-sm">
              {upcomingCasesCategoryFilter 
                ? 'Try selecting a different category or clear the filter to see all upcoming cases'
                : 'Add resources to your upcoming cases by clicking "+ upcoming case" on any resource'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {upcomingCaseResources.map((resource, index) => {
              // Security: Use resource_id for drag-drop identification (prevent IDOR)
              const dragResourceId = resource.upcomingCaseResourceId || resource.id;
              const showDropIndicatorAbove = dragOverResourceId === dragResourceId && dragOverPosition === 'above' && draggedUpcomingCaseId !== dragResourceId;
              const showDropIndicatorBelow = dragOverResourceId === dragResourceId && dragOverPosition === 'below' && draggedUpcomingCaseId !== dragResourceId;
              
              return (
              <React.Fragment key={`fragment-${resource.id}`}>
                {/* Drop Indicator Line Above */}
                {showDropIndicatorAbove && (
                  <div className="h-1 bg-purple-500 dark:bg-purple-400 rounded-full mx-4 animate-pulse" />
                )}
                
              <div
                key={resource.id}
                draggable={true}
                onDragStart={(e) => {
                  // Security: Prevent drag if clicking on interactive elements (buttons, links)
                  // This prevents accidental drags when users click buttons
                  if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('textarea')) {
                    e.preventDefault();
                    return false;
                  }
                  handleUpcomingCaseDragStart(e, dragResourceId);
                }}
                onDragOver={(e) => handleUpcomingCaseDragOver(e, dragResourceId)}
                onDragLeave={(e) => {
                  // Only clear if we're actually leaving the element (not just moving to a child)
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverResourceId(null);
                    setDragOverPosition(null);
                  }
                }}
                onDragEnd={handleUpcomingCaseDragEnd}
                onDrop={(e) => handleUpcomingCaseDrop(e, dragResourceId)}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md transition-all cursor-move ${
                  draggedUpcomingCaseId === dragResourceId ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Drag Handle */}
                  <GripVertical 
                    className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing" 
                    size={20}
                  />
                  
                  {/* Up/Down Arrow Buttons */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMoveUp(dragResourceId, index)}
                      disabled={index === 0}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === 0
                          ? 'opacity-30 cursor-not-allowed text-gray-300 dark:text-gray-600'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400'
                      }`}
                      aria-label="Move up"
                      title="Move up"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => handleMoveDown(dragResourceId, index)}
                      disabled={index >= upcomingCaseResources.length - 1}
                      className={`p-1.5 rounded-md transition-colors ${
                        index >= upcomingCaseResources.length - 1
                          ? 'opacity-30 cursor-not-allowed text-gray-300 dark:text-gray-600'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400'
                      }`}
                      aria-label="Move down"
                      title="Move down"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                  
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
              
              {/* Drop Indicator Line Below */}
              {showDropIndicatorBelow && (
                <div className="h-1 bg-purple-500 dark:bg-purple-400 rounded-full mx-4 animate-pulse" />
              )}
              </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Resource Library</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Curated surgical techniques and educational materials</p>
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Categories</h3>
            {organizedCategories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-300">No categories available</p>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => onCategorySelect(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategoryId === null
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  All Categories
                </button>
                {organizedCategories.map(category => (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center">
                      <button
                        onClick={() => onCategorySelect(category.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategoryId === category.id
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {category.name}
                      </button>
                      {category.subcategories && category.subcategories.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories({
                              ...expandedCategories,
                              [category.id]: !expandedCategories[category.id]
                            });
                          }}
                          className="ml-1 px-2 py-2 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                          aria-label={expandedCategories[category.id] ? 'Collapse' : 'Expand'}
                        >
                          {expandedCategories[category.id] ? '▼' : '▶'}
                        </button>
                      )}
                    </div>
                    {expandedCategories[category.id] && category.subcategories && category.subcategories.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {category.subcategories.map(subcategory => (
                          <button
                            key={subcategory.id}
                            onClick={() => onCategorySelect(subcategory.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                              selectedCategoryId === subcategory.id
                                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-600'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10'
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
            availableSubspecialties={availableSubspecialties}
            browsingSubspecialtyId={browsingSubspecialtyId}
            userSubspecialtyId={currentUser?.subspecialtyId || null}
            onBrowsingSubspecialtyChange={onBrowsingSubspecialtyChange}
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

          {/* Pagination: [Next] when >10 resources; [Previous] and [Next] when on page 2+ */}
          {paginationTotal > 10 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {paginationPage > 1 && (
                <button
                  type="button"
                  onClick={onPaginationPrevious}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {paginationPage} of {paginationTotalPages}
              </span>
              <button
                type="button"
                onClick={onPaginationNext}
                disabled={paginationPage >= paginationTotalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoize UserView to prevent unnecessary re-renders
export default memo(UserView);
