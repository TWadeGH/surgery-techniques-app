/**
 * ResourcesManagement Component
 * Admin component for managing resources with drag-and-drop reordering
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useCallback, memo } from 'react';
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

  const handleDragStart = useCallback((e, resourceId) => {
    setDraggedResourceId(resourceId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetResourceId) => {
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
  }, [draggedResourceId, resources, onReorderResources]);

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

// Memoize ResourcesManagement to prevent unnecessary re-renders
export default memo(ResourcesManagement);
