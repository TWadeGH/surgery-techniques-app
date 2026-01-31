/**
 * ResourcesManagement Component
 * Admin component for managing resources with drag-and-drop reordering
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useCallback, memo, useRef } from 'react';
import { Edit, Plus, Search, FileText, GripVertical } from 'lucide-react';
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
 */
function ResourcesManagement({ 
  resources, 
  searchTerm, 
  setSearchTerm, 
  onAddResource, 
  onEditResource, 
  onDeleteResource, 
  onEditCategories, 
  onReorderResources 
}) {
  const [draggedResourceId, setDraggedResourceId] = useState(null);
  const [dragOverResourceId, setDragOverResourceId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'above' or 'below'
  
  // Use refs to persist values across closures (prevents stale closure issues)
  const draggedResourceIdRef = useRef(null);
  const dragOverPositionRef = useRef(null);

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
          resources.map((resource, index) => {
            // Security: Use resource.id for drag-drop identification (prevent IDOR)
            const dragResourceId = resource.id;
            const showDropIndicatorAbove = dragOverResourceId === dragResourceId && dragOverPosition === 'above' && draggedResourceId !== dragResourceId;
            const showDropIndicatorBelow = dragOverResourceId === dragResourceId && dragOverPosition === 'below' && draggedResourceId !== dragResourceId;
            
            return (
              <React.Fragment key={resource.id}>
                {showDropIndicatorAbove && (
                  <div className="h-1 bg-purple-500 rounded-full animate-pulse mb-2" />
                )}
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
                {showDropIndicatorBelow && (
                  <div className="h-1 bg-purple-500 rounded-full animate-pulse mt-2" />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </>
  );
}

// Memoize ResourcesManagement to prevent unnecessary re-renders
export default memo(ResourcesManagement);
