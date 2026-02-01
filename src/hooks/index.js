/**
 * Custom Hooks Index
 * 
 * Centralized export of all custom hooks for clean imports.
 * 
 * Usage:
 * import { useAuth, useResources, useFavorites } from './hooks';
 * 
 * All hooks follow React best practices:
 * - Proper cleanup in useEffect
 * - Memoization for performance
 * - Optimistic updates for better UX
 * - Error handling with rollback
 * - Loading states
 * - TypeScript-ready (when migrating)
 */

export { useAuth } from './useAuth';
export { useResources } from './useResources';
export { useFavorites } from './useFavorites';
export { useNotes } from './useNotes';
export { useUpcomingCases } from './useUpcomingCases';
export { useAnalytics } from './useAnalytics';
export { useAdminActivity } from './useAdminActivity';
export { useRoleManagement } from './useRoleManagement';
export { useSponsorshipInquiries } from './useSponsorshipInquiries';
