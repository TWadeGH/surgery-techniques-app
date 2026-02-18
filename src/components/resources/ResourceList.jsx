/**
 * ResourceList Component
 * Displays a list of resources with empty state handling
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import ResourceCard from './Resourcecard';

/**
 * Loading Skeleton Component
 * Displayed while resources are loading
 */
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Image skeleton */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700 mx-auto sm:mx-0"></div>
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              {/* Badges */}
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              
              {/* Title */}
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              
              {/* Description */}
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
              
              {/* Source line */}
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              
              {/* Button */}
              <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-40"></div>
              
              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Empty State Component
 * Displayed when no resources are found
 * 
 * @param {Object} props
 * @param {boolean} props.showFavoritesOnly - Whether showing favorites only
 */
const EmptyState = memo(function EmptyState({ showFavoritesOnly }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-12 sm:p-16 text-center shadow-md border border-gray-200 dark:border-gray-700">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
          <FileText size={32} className="text-purple-600 dark:text-purple-400" />
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
});

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
 * @param {Function} props.onReportResource - Callback to open report modal for a resource
 * @param {boolean} props.loading - Whether resources are loading
 * @param {Array} props.companies - Array of active companies for Contact Rep feature
 * @param {Function} props.onContactRep - Callback to contact company rep
 * @param {Function} props.getCalendarEvent - Function to get calendar event for a resource
 * @param {Function} props.onCreateCalendarEvent - Callback to create calendar event
 * @param {Function} props.onDeleteCalendarEvent - Callback to delete calendar event
 * @param {boolean} props.isCalendarConnected - Whether user has connected calendar
 */
function ResourceList({
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
  onReportResource,
  loading = false,
  companies = [],
  onContactRep,
  getCalendarEvent,
  onCreateCalendarEvent,
  onDeleteCalendarEvent,
  isCalendarConnected = false,
  calendarConnections = [],
}) {
  // Show loading skeleton while loading
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Safety check for resources
  if (!resources || !Array.isArray(resources)) {
    console.warn('ResourceList: resources prop is not an array', resources);
    return <EmptyState showFavoritesOnly={showFavoritesOnly} />;
  }

  // Show empty state if no resources
  if (resources.length === 0) {
    return <EmptyState showFavoritesOnly={showFavoritesOnly} />;
  }

  // Memoize upcoming case IDs for efficient lookup
  const upcomingCaseResourceIds = useMemo(() => {
    return new Set(upcomingCases.map(uc => uc?.resource_id).filter(Boolean));
  }, [upcomingCases]);

  // Memoized helper to check if favorited
  const checkIsFavorited = useCallback((resourceId) => {
    if (isFavorited && typeof isFavorited === 'function') {
      return isFavorited(resourceId);
    }
    return favorites.includes(resourceId);
  }, [isFavorited]);

  // Memoized helper to get note
  const getNoteText = useCallback((resourceId) => {
    if (getNote && typeof getNote === 'function') {
      return getNote(resourceId) || '';
    }
    return notes[resourceId] || '';
  }, [getNote, notes]);

  // Memoize filtered resources (safety check)
  const validResources = useMemo(() => {
    return resources.filter((resource, index) => {
      if (!resource || !resource.id) {
        console.warn('ResourceList: Invalid resource at index', index, resource);
        return false;
      }
      return true;
    });
  }, [resources]);

  // Memoize company lookup for performance
  const activeCompanyNames = useMemo(() => {
    const names = new Set(companies.map(c => c.name?.toLowerCase()).filter(Boolean));
    if (names.size > 0) {
      console.log('🏢 Active companies:', Array.from(names));
    }
    return names;
  }, [companies]);

  // Helper to check if resource's company is active
  const isCompanyActive = useCallback((resource) => {
    if (!resource.company_name) return false;
    return activeCompanyNames.has(resource.company_name.toLowerCase());
  }, [activeCompanyNames]);

  return (
    <div className="space-y-2">
      {validResources.map((resource, index) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          isFavorited={checkIsFavorited(resource.id)}
          note={getNoteText(resource.id)}
          onToggleFavorite={onToggleFavorite}
          onUpdateNote={onUpdateNote}
          onToggleUpcomingCase={onToggleUpcomingCase}
          isUpcomingCase={upcomingCaseResourceIds.has(resource.id)}
          index={index}
          currentUser={currentUser}
          onReportResource={onReportResource}
          companyIsActive={isCompanyActive(resource)}
          onContactRep={onContactRep}
          calendarEvent={getCalendarEvent ? getCalendarEvent(resource.id) : null}
          onCreateCalendarEvent={onCreateCalendarEvent}
          onDeleteCalendarEvent={onDeleteCalendarEvent}
          isCalendarConnected={isCalendarConnected}
          calendarConnections={calendarConnections}
        />
      ))}
    </div>
  );
}

// Memoize ResourceList to prevent unnecessary re-renders
export default memo(ResourceList);
