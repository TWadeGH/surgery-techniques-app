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

// Future hooks to add:
// export { default as useCategories } from './useCategories';
// export { default as useProcedures } from './useProcedures';
// export { default as useSearch } from './useSearch';
// export { default as useDarkMode } from './useDarkMode';
// export { default as useAnalytics } from './useAnalytics';
