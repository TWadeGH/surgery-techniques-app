/**
 * AdminResourceCard Component
 * Admin view of a resource card with edit/delete actions and drag-and-drop
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Video, FileText, Link, Edit, Trash2, Sparkles, ArrowRight, GripVertical } from 'lucide-react';
import { RESOURCE_TYPES } from '../../utils/constants';

/**
 * AdminResourceCard Component
 * 
 * @param {Object} props
 * @param {Object} props.resource - Resource object
 * @param {Function} props.onEdit - Callback to edit resource
 * @param {Function} props.onDelete - Callback to delete resource
 * @param {number} props.index - Index of resource in list
 * @param {Function} props.onDragStart - Callback for drag start
 * @param {Function} props.onDragOver - Callback for drag over
 * @param {Function} props.onDrop - Callback for drop
 * @param {boolean} props.isDragging - Whether this resource is being dragged
 */
function AdminResourceCard({ 
  resource, 
  onEdit, 
  onDelete, 
  index, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  isDragging 
}) {
  // Memoize type-related functions
  const typeIcon = useMemo(() => {
    switch(resource.resource_type) {
      case RESOURCE_TYPES.VIDEO: return <Video size={20} />;
      case RESOURCE_TYPES.PDF: return <FileText size={20} />;
      case RESOURCE_TYPES.ARTICLE: return <FileText size={20} />;
      default: return <Link size={20} />;
    }
  }, [resource.resource_type]);

  const typeColor = useMemo(() => {
    switch(resource.resource_type) {
      case RESOURCE_TYPES.VIDEO: return 'from-red-500 to-pink-500';
      case RESOURCE_TYPES.PDF: return 'from-blue-500 to-cyan-500';
      case RESOURCE_TYPES.ARTICLE: return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  }, [resource.resource_type]);

  const typeLabel = useMemo(() => {
    switch(resource.resource_type) {
      case RESOURCE_TYPES.PDF: return 'PDF / Guide';
      default: return resource.resource_type;
    }
  }, [resource.resource_type]);

  // Memoize event handlers
  const handleEdit = useCallback(() => {
    onEdit(resource);
  }, [onEdit, resource]);

  const handleDelete = useCallback(() => {
    onDelete(resource.id);
  }, [onDelete, resource.id]);

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
        {/* Image */}
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
              <FileText size={20} className="text-gray-400" />
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
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${typeColor} text-white text-xs sm:text-sm font-medium`}>
              {typeIcon}
              <span className="capitalize">{typeLabel}</span>
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
              onClick={handleEdit}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm sm:text-base font-medium hover:bg-purple-200 transition-colors"
              aria-label={`Edit resource: ${resource.title}`}
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm sm:text-base font-medium hover:bg-red-200 transition-colors"
              aria-label={`Delete resource: ${resource.title}`}
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

// Memoize AdminResourceCard to prevent unnecessary re-renders
export default memo(AdminResourceCard, (prevProps, nextProps) => {
  return (
    prevProps.resource?.id === nextProps.resource?.id &&
    prevProps.index === nextProps.index &&
    prevProps.isDragging === nextProps.isDragging
  );
});
