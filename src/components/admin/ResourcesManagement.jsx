/**
 * ResourcesManagement Component
 * Admin component for managing resources with drag-and-drop reordering
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { Edit, Plus, Search, FileText, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import AdminResourceCard from './AdminResourceCard';

/**
 * ResourcesManagement Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of resource objects
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.setSearchTerm - Callback to update search term
 * @param {Function} props.onAddResource - Callback to add resource
 * @param {Function} props.onEditResource - Callback to edit resource
 * @param {Function} props.onDeleteResource - Callback to delete resource
 * @param {Function} props.onEditCategories - Callback to edit categories
 * @param {Function} props.onReorderResources - Callback to reorder resources
 * @param {Array} props.categories - Array of category objects
 * @param {string} props.selectedCategoryId - Currently selected category ID
 * @param {Function} props.onCategorySelect - Callback when category is selected
 */
function ResourcesManagement({
  resources,
  searchTerm,
  setSearchTerm,
  onAddResource,
  onEditResource,
  onDeleteResource,
  onEditCategories,
  onReorderResources,
  categories = [],
  selectedCategoryId = null,
  onCategorySelect,
}) {
  const [draggedResourceId, setDraggedResourceId] = useState(null);
  const [dragOverResourceId, setDragOverResourceId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'above' or 'below'
  
  // Use refs to persist values across closures (prevents stale closure issues)
  const draggedResourceIdRef = useRef(null);
  const dragOverPositionRef = useRef(null);

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

  // Filter resources by selected category
  const filteredByCategory = useMemo(() => {
    if (!selectedCategoryId) return resources;
    // Include subcategories
    const categoryIds = [selectedCategoryId];
    const subcategoryIds = categories
      .filter(c => c.parent_category_id === selectedCategoryId)
      .map(c => c.id);
    const allCategoryIds = [...categoryIds, ...subcategoryIds];
    return resources.filter(r => r.category_id && allCategoryIds.includes(r.category_id));
  }, [resources, selectedCategoryId, categories]);

  // Security: Validate resourceId input to prevent IDOR and type confusion
  const handleDragStart = useCallback((e, resourceId) => {
    // Security: Input validation - validate resourceId format (UUID)
    if (!resourceId || typeof resourceId !== 'string' || resourceId.length > 100) {
      e.preventDefault();
      return;
    }
    console.log('🔵 Admin drag start:', resourceId.substring(0, 8));
    setDraggedResourceId(resourceId);
    draggedResourceIdRef.current = resourceId; // Store in ref for reliable access
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', resourceId); // Set data for drag
    e.stopPropagation(); // Prevent child elements from interfering
  }, []);

  // Security: Validate resourceId and calculate drop position
  const handleDragOver = useCallback((e, targetResourceId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
    
    // Security: Validate resourceId (prevent IDOR, type confusion)
    if (!targetResourceId || typeof targetResourceId !== 'string' || targetResourceId.length > 100) {
      return;
    }
    
    // Only process if we're actually dragging something
    if (!draggedResourceId) {
      return;
    }
    
    // Determine if drop is above or below based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const elementCenterY = rect.top + rect.height / 2;
    const position = mouseY < elementCenterY ? 'above' : 'below';
    
    setDragOverResourceId(targetResourceId);
    setDragOverPosition(position);
    dragOverPositionRef.current = position; // Store in ref for reliable access
  }, [draggedResourceId]);

  const handleDragEnd = useCallback((e) => {
    console.log('🔵 Admin dragEnd called');
    // Clean up drag state only if drop was successful
    // Don't clear here - let handleDrop clear it after successful reorder
    // This prevents state from being cleared if dragEnd fires before drop
    e.stopPropagation();
  }, []);

  // Handle manual reorder with up/down buttons
  const handleMoveResource = useCallback(async (resourceId, direction) => {
    const resourceIndex = filteredByCategory.findIndex(r => r.id === resourceId);
    if (resourceIndex === -1) return;
    
    const targetIndex = direction === 'up' ? resourceIndex - 1 : resourceIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredByCategory.length) return;
    
    // Create new order
    const newOrder = [...filteredByCategory];
    const [removed] = newOrder.splice(resourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    
    if (onReorderResources) {
      await onReorderResources(newOrder);
    }
  }, [filteredByCategory, onReorderResources]);

  // Security: Validate resourceIds, prevent IDOR, calculate correct destination
  const handleDrop = useCallback(async (e, targetResourceId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use refs to get current values (avoids stale closure issues)
    const currentDraggedId = draggedResourceIdRef.current;
    const currentPosition = dragOverPositionRef.current || 'below'; // Default to 'below' if null
    
    console.log('🔵 Admin drop:', {
      dragged: currentDraggedId?.substring(0, 8),
      target: targetResourceId?.substring(0, 8),
      position: currentPosition,
      resourcesCount: resources.length,
      draggedResourceIdState: draggedResourceId?.substring(0, 8),
      draggedResourceIdRef: draggedResourceIdRef.current?.substring(0, 8)
    });
    
    // Security: Validate resourceIds (prevent IDOR, type confusion)
    if (!currentDraggedId || !targetResourceId || 
        typeof currentDraggedId !== 'string' || typeof targetResourceId !== 'string' ||
        currentDraggedId.length > 100 || targetResourceId.length > 100 ||
        currentDraggedId === targetResourceId) {
      console.log('❌ Admin drop validation failed:', {
        hasDragged: !!currentDraggedId,
        hasTarget: !!targetResourceId,
        sameId: currentDraggedId === targetResourceId,
        draggedId: currentDraggedId?.substring(0, 8),
        targetId: targetResourceId?.substring(0, 8)
      });
      setDraggedResourceId(null);
      draggedResourceIdRef.current = null;
      setDragOverResourceId(null);
      setDragOverPosition(null);
      dragOverPositionRef.current = null;
      return;
    }

    // Security: Create a new array to avoid mutating the original
    const newOrder = [...resources];
    const draggedIndex = newOrder.findIndex(r => r && r.id === currentDraggedId);
    const targetIndex = newOrder.findIndex(r => r && r.id === targetResourceId);

    console.log('🔵 Admin drop indices:', { 
      draggedIndex, 
      targetIndex, 
      totalResources: newOrder.length,
      draggedId: currentDraggedId.substring(0, 8),
      targetId: targetResourceId.substring(0, 8)
    });

    if (draggedIndex === -1 || targetIndex === -1) {
      console.log('❌ Admin drop invalid indices:', { draggedIndex, targetIndex });
      setDraggedResourceId(null);
      setDragOverResourceId(null);
      setDragOverPosition(null);
      return;
    }

    // Calculate destination index based on drop position
    let destinationIndex;
    if (currentPosition === 'above') {
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

    console.log('🔵 Admin drop destination:', destinationIndex);

    // Security: Reorder the array (create new array, don't mutate)
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(destinationIndex, 0, removed);

    console.log('🔵 Admin drop new order:', newOrder.map((r, i) => ({ index: i, id: r.id.substring(0, 8) })));

    if (onReorderResources) {
      console.log('🔵 Calling onReorderResources...');
      await onReorderResources(newOrder);
      console.log('✅ onReorderResources completed');
    } else {
      console.log('❌ onReorderResources is not defined!');
    }
    
    // Clean up state after successful reorder
    setDraggedResourceId(null);
    draggedResourceIdRef.current = null;
    setDragOverResourceId(null);
    setDragOverPosition(null);
    dragOverPositionRef.current = null;
  }, [resources, onReorderResources]);

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
            aria-label="Edit categories"
          >
            <Edit size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Edit Categories</span>
            <span className="sm:hidden">Categories</span>
          </button>
          <button
            onClick={onAddResource}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm sm:text-base font-medium glow-button"
            aria-label="Add new resource"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            Add Resource
          </button>
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
                  onClick={() => onCategorySelect && onCategorySelect(null)}
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
                        onClick={() => onCategorySelect && onCategorySelect(category.id)}
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
                            onClick={() => onCategorySelect && onCategorySelect(subcategory.id)}
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
          <div className="glass rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl text-sm sm:text-base focus:border-purple-500 focus:outline-none transition-colors"
                aria-label="Search resources"
              />
            </div>
          </div>

          {/* Resources List */}
          <div className="space-y-3 sm:space-y-4 pl-12">
            {filteredByCategory.length === 0 ? (
              <div className="glass rounded-2xl p-8 sm:p-16 text-center shadow-lg">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                    <FileText size={24} className="text-purple-600 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">No resources found</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    {selectedCategoryId ? 'No resources in this category.' : 'Click "Add Resource" to get started!'}
                  </p>
                </div>
              </div>
            ) : (
              filteredByCategory.map((resource, index) => {
                // Security: Use resource.id for drag-drop identification (prevent IDOR)
                const dragResourceId = resource.id;
                const showDropIndicatorAbove = dragOverResourceId === dragResourceId && dragOverPosition === 'above' && draggedResourceId !== dragResourceId;
                const showDropIndicatorBelow = dragOverResourceId === dragResourceId && dragOverPosition === 'below' && draggedResourceId !== dragResourceId;
            
                return (
                  <React.Fragment key={resource.id}>
                    {showDropIndicatorAbove && (
                      <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg animate-pulse mb-3 mx-4" />
                    )}
                    <div className="relative">
                      {/* Up/Down Arrow Buttons */}
                      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
                        <button
                          onClick={() => handleMoveResource(resource.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white dark:disabled:hover:bg-gray-800 shadow-md"
                          title="Move up"
                          aria-label="Move resource up"
                        >
                          <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleMoveResource(resource.id, 'down')}
                          disabled={index === filteredByCategory.length - 1}
                          className="p-1.5 sm:p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white dark:disabled:hover:bg-gray-800 shadow-md"
                          title="Move down"
                          aria-label="Move resource down"
                        >
                          <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      <AdminResourceCard
                        resource={resource}
                        onEdit={onEditResource}
                        onDelete={onDeleteResource}
                        index={index}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        isDragging={draggedResourceId === resource.id}
                      />
                    </div>
                    {showDropIndicatorBelow && (
                      <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg animate-pulse mt-3 mx-4" />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Memoize ResourcesManagement to prevent unnecessary re-renders
export default memo(ResourcesManagement);
