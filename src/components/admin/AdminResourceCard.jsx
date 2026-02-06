/**
 * AdminResourceCard Component
 * Admin view of a resource card with edit/delete actions and drag-and-drop
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Video, FileText, Link, Edit, Trash2, Sparkles, ArrowRight, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
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
 * @param {Function} props.onDragEnd - Callback for drag end
 * @param {Function} props.onDrop - Callback for drop
 * @param {boolean} props.isDragging - Whether this resource is being dragged
 * @param {Function} props.onMoveUp - Callback to move resource up (null if disabled)
 * @param {Function} props.onMoveDown - Callback to move resource down (null if disabled)
 */
function AdminResourceCard({ 
  resource, 
  onEdit, 
  onDelete, 
  index, 
  onDragStart, 
  onDragOver, 
  onDragEnd,
  onDrop, 
  isDragging,
  onMoveUp,
  onMoveDown
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
      onDragStart={onDragStart ? (e) => {
        console.log('🔵 AdminResourceCard dragStart:', resource.id.substring(0, 8), 'target:', e.target.tagName);
        // Security: Prevent drag if clicking on interactive elements (buttons, links, inputs)
        // This prevents accidental drags when users click buttons or links
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('textarea')) {
          console.log('❌ Drag prevented - interactive element');
          e.preventDefault();
          return false;
        }
        // Security: Prevent child elements from interfering with drag
        e.stopPropagation();
        onDragStart(e, resource.id);
      } : undefined}
      onDragOver={onDragOver ? (e) => {
        // Security: Prevent child elements from interfering with drag
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e, resource.id);
      } : undefined}
      onDragEnd={onDragEnd ? (e) => {
        console.log('🔵 AdminResourceCard dragEnd');
        // Security: Prevent child elements from interfering with drag
        e.stopPropagation();
        // Don't call onDragEnd here - let ResourcesManagement handle cleanup after drop
        // This prevents state from being cleared prematurely
      } : undefined}
      onDrop={onDrop ? (e) => {
        // Security: Prevent child elements from interfering with drop
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, resource.id);
      } : undefined}
      className={`glass rounded-lg p-3 shadow-md card-hover animate-slide-up cursor-move ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center justify-between mb-2">
        {onDragStart && (
          <div className="flex items-center gap-2 text-gray-400 text-xs select-none pointer-events-none">
            <GripVertical size={16} className="cursor-grab" />
            <span>Drag to reorder</span>
          </div>
        )}
        {/* Up/Down Arrow Buttons - Top Right Corner */}
        {(onMoveUp || onMoveDown) && (
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!onMoveUp}
              className="p-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-purple-50 hover:border-purple-500 dark:hover:bg-purple-900/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 dark:disabled:hover:bg-gray-700"
              title="Move up"
              aria-label="Move resource up"
            >
              <ChevronUp size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!onMoveDown}
              className="p-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-purple-50 hover:border-purple-500 dark:hover:bg-purple-900/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 dark:disabled:hover:bg-gray-700"
              title="Move down"
              aria-label="Move resource down"
            >
              <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Image */}
        <div className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 mx-auto sm:mx-0">
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
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs font-medium">
                <Sparkles size={12} />
                <span>Sponsored</span>
              </div>
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${typeColor} text-white text-sm font-medium`}>
              {typeIcon}
              <span className="capitalize">{typeLabel}</span>
            </div>
          </div>

          <h4 className="font-bold text-base text-gray-900 dark:text-white mb-1 break-words">{resource.title}</h4>
          <p className="text-gray-600 dark:text-gray-300 text-xs mb-1.5 line-clamp-2 break-words">{resource.description}</p>
          
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            onMouseDown={(e) => e.stopPropagation()}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs break-all flex items-center gap-1 mb-2"
          >
            <span className="truncate">{resource.url}</span>
            <ArrowRight size={14} className="flex-shrink-0" />
          </a>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleEdit}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              aria-label={`Edit resource: ${resource.title}`}
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
