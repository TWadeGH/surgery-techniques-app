/**
 * ResourceFilters Component
 * Search bar and filtering controls for resources
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { memo, useCallback, useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

/**
 * ResourceFilters Component
 * 
 * @param {Object} props
 * @param {string} props.searchTerm - Current search term
 * @param {Function} props.onSearchChange - Callback when search changes
 * @param {string} props.placeholder - Search placeholder text
 * @param {Array} props.availableSubspecialties - Array of available subspecialties for browsing
 * @param {string|null} props.browsingSubspecialtyId - Currently selected browsing subspecialty ID (null = use profile)
 * @param {string|null} props.userSubspecialtyId - User's profile subspecialty ID
 * @param {Function} props.onBrowsingSubspecialtyChange - Callback when browsing subspecialty changes
 */
function ResourceFilters({
  searchTerm = '',
  onSearchChange,
  placeholder = 'Search resources...',
  availableSubspecialties = [],
  browsingSubspecialtyId = null,
  userSubspecialtyId = null,
  onBrowsingSubspecialtyChange,
}) {
  const [isTyping, setIsTyping] = useState(false);

  /**
   * Handle search input change (memoized)
   * Shows typing indicator briefly
   * @param {Event} e - Input change event
   */
  const handleSearchChange = useCallback((e) => {
    setIsTyping(true);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  }, [onSearchChange]);

  /**
   * Reset typing indicator after user stops typing
   */
  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [searchTerm, isTyping]);

  /**
   * Handle browsing subspecialty change
   * Security: Validates input before calling callback
   * @param {Event} e - Select change event
   */
  const handleSubspecialtyChange = useCallback((e) => {
    const value = e.target.value;
    // Security: Allow empty string (null) to reset to profile subspecialty
    const subspecialtyId = value === '' ? null : value;
    if (onBrowsingSubspecialtyChange) {
      onBrowsingSubspecialtyChange(subspecialtyId);
    }
  }, [onBrowsingSubspecialtyChange]);

  // Get current subspecialty name for display
  const currentSubspecialtyName = browsingSubspecialtyId
    ? availableSubspecialties.find(sub => sub.id === browsingSubspecialtyId)?.name || 'Unknown'
    : availableSubspecialties.find(sub => sub.id === userSubspecialtyId)?.name || 'My Subspecialty';

  return (
    <div className="glass rounded-2xl p-6 mb-6 shadow-lg space-y-4">
      {/* Browse by Subspecialty Dropdown */}
      {availableSubspecialties.length > 0 && (
        <div>
          <label htmlFor="browse-subspecialty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Browse by Subspecialty
          </label>
          <select
            id="browse-subspecialty"
            value={browsingSubspecialtyId || ''}
            onChange={handleSubspecialtyChange}
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            aria-label="Select subspecialty to browse"
          >
            <option value="">My Subspecialty (Default)</option>
            {availableSubspecialties.map((subspecialty) => (
              <option key={subspecialty.id} value={subspecialty.id}>
                {subspecialty.specialties?.name || 'Unknown'} - {subspecialty.name}
              </option>
            ))}
          </select>
          {browsingSubspecialtyId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Currently browsing: <span className="font-medium">{currentSubspecialtyName}</span>
            </p>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400" 
          size={20}
          aria-hidden="true"
        />
        {isTyping && (
          <Loader2 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 dark:text-purple-400 animate-spin" 
            size={18}
            aria-label="Processing search"
          />
        )}
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          aria-label="Search resources"
        />
      </div>
    </div>
  );
}

// Memoize ResourceFilters to prevent unnecessary re-renders
export default memo(ResourceFilters);
