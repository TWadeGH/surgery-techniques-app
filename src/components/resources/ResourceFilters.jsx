/**
 * ResourceFilters Component
 * Search bar and filtering controls for resources
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { memo, useCallback } from 'react';
import { Search } from 'lucide-react';

/**
 * ResourceFilters Component
 * 
 * @param {Object} props
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.onSearchChange - Callback when search changes
 * @param {string} props.placeholder - Search placeholder text
 */
function ResourceFilters({
  searchTerm = '',
  onSearchChange,
  placeholder = 'Search resources...',
}) {
  /**
   * Handle search input change (memoized)
   * @param {Event} e - Input change event
   */
  const handleSearchChange = useCallback((e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  }, [onSearchChange]);

  return (
    <div className="glass rounded-2xl p-6 mb-6 shadow-lg">
      <div className="relative">
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
          size={20}
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          aria-label="Search resources"
        />
      </div>
    </div>
  );
}

// Memoize ResourceFilters to prevent unnecessary re-renders
export default memo(ResourceFilters);
