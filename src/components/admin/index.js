/**
 * Admin Components Index
 * Export all admin components from a single location for easier imports
 * 
 * Usage:
 * import { SuggestedResourcesModal, CategoryManagementModal } from './components/admin';
 */

export { default as SuggestedResourcesModal } from './SuggestedResourcesModal';
export { default as CategoryManagementModal } from './CategoryManagementModal';
export { default as EditResourceModal } from './EditResourceModal';
export { default as AddResourceModal } from './AddResourceModal';
export { default as AdminView } from './AdminView';
// ResourcesManagement and AnalyticsDashboard are lazy loaded in AdminView
// Don't export them statically to avoid circular dependency issues
// export { default as ResourcesManagement } from './ResourcesManagement';
// export { default as AnalyticsDashboard } from './AnalyticsDashboard';
export { default as AdminResourceCard } from './AdminResourceCard';
