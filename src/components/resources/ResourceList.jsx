/**
 * ResourceList Component
 * Displays a list of resources with empty state handling
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React from 'react';
import { FileText } from 'lucide-react';
import ResourceCard from './Resourcecard';

/**
 * Empty State Component
 * Displayed when no resources are found
 * 
 * @param {Object} props
 * @param {boolean} props.showFavoritesOnly - Whether showing favorites only
 */
function EmptyState({ showFavoritesOnly }) {
  return (
    <div className="glass rounded-2xl p-16 text-center shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
          <FileText size={32} className="text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {showFavoritesOnly ? 'No favorites yet' : 'No resources found'}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {showFavoritesOnly 
            ? 'Heart some resources to see them here!' 
            : 'Try adjusting your search or check back later!'}
        </p>
      </div>
    </div>
  );
}

/**
 * ResourceList Component
 * 
 * @param {Object} props
 * @param {Array} props.resources - Array of resource objects
 * @param {Array} props.favorites - Array of favorited resource IDs (optional, for backward compatibility)
 * @param {Object} props.notes - Object mapping resource IDs to notes (optional, for backward compatibility)
 * @param {Function} props.isFavorited - Function to check if resource is favorited (preferred)
 * @param {Function} props.getNote - Function to get note for resource (preferred)
 * @param {Array} props.upcomingCases - Array of upcoming case objects
 * @param {Function} props.onToggleFavorite - Callback for toggling favorite
 * @param {Function} props.onUpdateNote - Callback for updating note
 * @param {Function} props.onToggleUpcomingCase - Callback for toggling upcoming case
 * @param {Object} props.currentUser - Current user object
 * @param {boolean} props.showFavoritesOnly - Whether showing favorites only
 */
export default function ResourceList({
  resources,
  favorites = [],
  notes = {},
  isFavorited,
  getNote,
  upcomingCases = [],
  onToggleFavorite,
  onUpdateNote,
  onToggleUpcomingCase,
  currentUser,
  showFavoritesOnly = false,
}) {
  // Safety check for resources
  if (!resources || !Array.isArray(resources)) {
    console.warn('ResourceList: resources prop is not an array', resources);
    return <EmptyState showFavoritesOnly={showFavoritesOnly} />;
  }

  // Show empty state if no resources
  if (resources.length === 0) {
    return <EmptyState showFavoritesOnly={showFavoritesOnly} />;
  }

  // Helper to check if favorited (use function if provided, otherwise use array)
  const checkIsFavorited = (resourceId) => {
    if (isFavorited && typeof isFavorited === 'function') {
      return isFavorited(resourceId);
    }
    return favorites.includes(resourceId);
  };

  // Helper to get note (use function if provided, otherwise use object)
  const getNoteText = (resourceId) => {
    if (getNote && typeof getNote === 'function') {
      return getNote(resourceId) || '';
    }
    return notes[resourceId] || '';
  };

  return (
    <div className="space-y-4">
      {resources.map((resource, index) => {
        // Safety check for individual resource
        if (!resource || !resource.id) {
          console.warn('ResourceList: Invalid resource at index', index, resource);
          return null;
        }

        return (
          <ResourceCard 
            key={resource.id} 
            resource={resource}
            isFavorited={checkIsFavorited(resource.id)}
            note={getNoteText(resource.id)}
            onToggleFavorite={onToggleFavorite}
            onUpdateNote={onUpdateNote}
            onToggleUpcomingCase={onToggleUpcomingCase}
            isUpcomingCase={upcomingCases.some(uc => uc && uc.resource_id === resource.id)}
            index={index}
            currentUser={currentUser}
          />
        );
      })}
    </div>
  );
}
