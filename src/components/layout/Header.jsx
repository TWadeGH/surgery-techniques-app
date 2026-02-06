/**
 * Header Component
 * Main navigation header with user controls and view switching
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React from 'react';
import { LogOut, Settings, Plus } from 'lucide-react';
import { isAdmin } from '../../utils/helpers';
import { VIEW_MODES, USER_TYPES } from '../../utils/constants';

/**
 * View Switcher Component
 * Toggle between user, admin, and rep views
 */
function ViewSwitcher({ currentView, onViewChange, showAdmin, showRep }) {
  return (
    <div className="flex gap-2 glass-dark rounded-full p-1">
      <button
        onClick={() => onViewChange(VIEW_MODES.USER)}
        className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
          currentView === VIEW_MODES.USER
            ? 'bg-white text-purple-900 shadow-lg'
            : 'text-white hover:bg-white/10'
        }`}
        aria-label="Switch to browse view"
      >
        Browse
      </button>
      {showAdmin && (
        <button
          onClick={() => onViewChange(VIEW_MODES.ADMIN)}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
            currentView === VIEW_MODES.ADMIN
              ? 'bg-white text-purple-900 shadow-lg'
              : 'text-white hover:bg-white/10'
          }`}
          aria-label="Switch to admin view"
        >
          Admin
        </button>
      )}
      {showRep && (
        <button
          onClick={() => onViewChange(VIEW_MODES.REP)}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
            currentView === VIEW_MODES.REP
              ? 'bg-white text-purple-900 shadow-lg'
              : 'text-white hover:bg-white/10'
          }`}
          aria-label="Switch to rep view"
        >
          Rep
        </button>
      )}
    </div>
  );
}

/**
 * Upcoming Cases Button
 * Shows upcoming cases count and toggles view
 */
function UpcomingCasesButton({ showUpcomingCases, upcomingCasesCount, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
        showUpcomingCases 
          ? 'bg-white text-purple-900 shadow-lg' 
          : 'text-white hover:bg-white/10'
      } ${disabled || !onClick ? 'opacity-60 cursor-not-allowed' : ''}`}
      aria-label={showUpcomingCases ? 'Hide upcoming cases' : 'Show upcoming cases'}
      title={disabled || !onClick ? 'Upcoming Cases available for Surgeons and Trainees' : (showUpcomingCases ? 'Hide upcoming cases' : 'Show upcoming cases')}
    >
      <Plus size={18} />
      <span className="hidden sm:inline">Upcoming Cases</span>
      <span className="sm:hidden">Cases</span>
      {upcomingCasesCount > 0 && (
        <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
          {upcomingCasesCount}
        </span>
      )}
    </button>
  );
}

/**
 * Header Component
 *
 * @param {Object} props
 * @param {Object} props.currentUser - Current logged-in user
 * @param {string} props.currentView - Current view mode ('user', 'admin', or 'rep')
 * @param {Function} props.onViewChange - Callback when view changes
 * @param {boolean} props.showUpcomingCases - Whether upcoming cases view is active
 * @param {number} props.upcomingCasesCount - Number of upcoming cases
 * @param {Function} props.onToggleUpcomingCases - Callback to toggle upcoming cases
 * @param {Function} props.onSettingsClick - Callback when settings clicked
 * @param {Function} props.onSignOut - Callback when sign out clicked
 * @param {boolean} props.isRep - Whether user is a company rep
 */
export default function Header({
  currentUser,
  currentView = VIEW_MODES.USER,
  onViewChange,
  showUpcomingCases = false,
  upcomingCasesCount = 0,
  onToggleUpcomingCases,
  onSettingsClick,
  onSignOut,
  isRep = false,
}) {
  const userIsAdmin = isAdmin(currentUser);
  const hasMultipleViews = userIsAdmin || isRep;
  // Show upcoming cases button for all users, but only allow interaction for surgeons/trainees
  // Security: Uses allowlist validation to prevent injection
  const canInteractWithUpcomingCases = (() => {
    if (currentView !== VIEW_MODES.USER || !currentUser?.userType) return false;
    
    // Security: Validate userType is a string and use allowlist
    if (typeof currentUser.userType !== 'string') return false;
    
    const userType = currentUser.userType.toLowerCase().trim();
    
    // Security: Allowlist of valid user types (all 4 onboarding options can use upcoming cases)
    const ALLOWED_USER_TYPES = ['surgeon', 'attending', 'trainee', 'resident', 'fellow', 'industry', 'student', 'other'];
    
    return ALLOWED_USER_TYPES.includes(userType);
  })();
  const canSeeUpcomingCases = currentView === VIEW_MODES.USER; // Show for all users

  /**
   * Handle sign out
   */
  async function handleSignOut() {
    if (onSignOut) {
      await onSignOut();
    }
  }

  return (
    <header className="gradient-bg relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>
      
      {/* Header Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          {/* Logo & Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Surgical Techniques
            </h1>
            <p className="text-purple-200 text-xs sm:text-sm mono">
              Vetted Surgeon Resource Hub
            </p>
          </div>

          {/* Navigation & Controls */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
            {/* User Email */}
            <span className="text-white text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">
              {currentUser?.email || currentUser?.id || 'User'}
            </span>
            
            {/* View Switcher (Admin and/or Rep) */}
            {hasMultipleViews && (
              <ViewSwitcher
                currentView={currentView}
                onViewChange={onViewChange}
                showAdmin={userIsAdmin}
                showRep={isRep}
              />
            )}

            {/* Upcoming Cases Button */}
            {canSeeUpcomingCases && (
              <UpcomingCasesButton
                showUpcomingCases={showUpcomingCases}
                upcomingCasesCount={upcomingCasesCount}
                onClick={canInteractWithUpcomingCases ? onToggleUpcomingCases : undefined}
                disabled={!canInteractWithUpcomingCases}
              />
            )}

            {/* Settings Button */}
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings size={18} />
              <span className="hidden sm:inline text-sm">Settings</span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
