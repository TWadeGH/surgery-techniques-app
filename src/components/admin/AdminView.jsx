/**
 * AdminView Component
 * Main admin dashboard view with resources, analytics, activity, roles, and sponsorship tabs
 */

import React, { useState, useMemo, memo, lazy, Suspense } from 'react';
import { Sparkles, Flag, ArrowRight, BarChart3, Activity, Shield, Handshake, MessageSquare } from 'lucide-react';
import { FullPageSpinner } from '../common/Spinner';
import { USER_ROLES } from '../../utils/constants';

// Lazy load admin components for better initial load performance
const ResourcesManagement = lazy(() => import('./ResourcesManagement'));
const AnalyticsDashboard = lazy(() => import('./analytics/AnalyticsDashboard'));
const AdminActivityPanel = lazy(() => import('./activity/AdminActivityPanel'));
const RoleManagementPanel = lazy(() => import('./roles/RoleManagementPanel'));
const SponsorshipInquiriesPanel = lazy(() => import('./sponsorship/SponsorshipInquiriesPanel'));
const MessagingPanel = lazy(() => import('./messaging/MessagingPanel'));

function AdminView({
  resources,
  adminTab,
  setAdminTab,
  onAddResource,
  onEditResource,
  onDeleteResource,
  onEditCategories,
  onReorderResources,
  currentUser,
  suggestedResources,
  onShowSuggestedResources,
  onApproveSuggestion,
  onRejectSuggestion,
  reportedResources = [],
  onShowReportedResources,
  onDismissReport,
  onMarkReviewedReport,
  sponsorshipPendingCount = 0,
  unreadMessageCount = 0,
  categories = [],
  selectedCategoryId = null,
  onCategorySelect,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isSpecialtyAdmin = currentUser?.role === USER_ROLES.SPECIALTY_ADMIN;
  const isSubspecialtyAdmin = currentUser?.role === USER_ROLES.SUBSPECIALTY_ADMIN;

  // Memoize filtered resources for performance
  const filteredResources = useMemo(() => {
    if (!resources || !Array.isArray(resources)) return [];
    if (searchTerm === '') return resources;
    const searchLower = searchTerm.toLowerCase();
    return resources.filter(r => {
      if (!r) return false;
      return (r.title && r.title.toLowerCase().includes(searchLower)) ||
             (r.description && r.description.toLowerCase().includes(searchLower));
    });
  }, [resources, searchTerm]);

  // Memoize pending counts
  const pendingCount = useMemo(() => {
    if (!suggestedResources || !Array.isArray(suggestedResources)) return 0;
    return suggestedResources.filter(s => s && s.status === 'pending').length;
  }, [suggestedResources]);

  const reportedPendingCount = useMemo(() => {
    if (!reportedResources || !Array.isArray(reportedResources)) return 0;
    return reportedResources.filter(r => r && r.status === 'pending').length;
  }, [reportedResources]);

  // Tab definitions with role gating
  const tabs = useMemo(() => {
    const t = [
      { key: 'resources', label: 'Resources', icon: null },
      { key: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart3 },
    ];
    if (isSuperAdmin || isSpecialtyAdmin) {
      t.push({ key: 'activity', label: 'Activity', icon: Activity });
    }
    if (isSuperAdmin) {
      t.push({ key: 'roles', label: 'Roles', icon: Shield });
    }
    if (isSuperAdmin || isSpecialtyAdmin) {
      t.push({ key: 'sponsorship', label: 'Sponsorship', icon: Handshake, badge: sponsorshipPendingCount });
    }
    // Messages tab visible to all admin roles
    t.push({ key: 'messages', label: 'Messages', shortLabel: 'Msgs', icon: MessageSquare, badge: unreadMessageCount });
    return t;
  }, [isSuperAdmin, isSpecialtyAdmin, sponsorshipPendingCount, unreadMessageCount]);

  const tabButtonClass = (key) =>
    `flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all ${
      adminTab === key
        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="animate-slide-up">
      {/* Suggested Resources & Reported Resources */}
      <div className="mb-6 space-y-4">
        <button
          onClick={onShowSuggestedResources}
          className="w-full glass rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all text-left group"
          aria-label={`View suggested resources (${pendingCount} pending)`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Suggested Resources
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {pendingCount} {pendingCount === 1 ? 'resource' : 'resources'} pending review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {pendingCount}
                </span>
              )}
              <ArrowRight size={20} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </div>
        </button>

        {/* Reported Resources */}
        {onShowReportedResources && (
          <button
            onClick={onShowReportedResources}
            className="w-full glass rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all text-left group"
            aria-label={`View reported resources (${reportedPendingCount} pending)`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Flag size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Reported Resources
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {reportedPendingCount} {reportedPendingCount === 1 ? 'report' : 'reports'} pending review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {reportedPendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                    {reportedPendingCount}
                  </span>
                )}
                <ArrowRight size={20} className="text-gray-400 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Manage content and view insights</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1.5 sm:p-2 mb-6 sm:mb-8 shadow-lg flex flex-wrap gap-1 sm:gap-2 w-full sm:w-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setAdminTab(tab.key)}
            className={tabButtonClass(tab.key)}
            aria-label={`${tab.label} tab`}
          >
            {tab.icon && <tab.icon size={16} />}
            <span className={tab.shortLabel ? 'hidden xs:inline' : ''}>{tab.label}</span>
            {tab.shortLabel && <span className="xs:hidden">{tab.shortLabel}</span>}
            {tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - Lazy loaded with Suspense */}
      {adminTab === 'resources' && (
        <Suspense fallback={<FullPageSpinner />}>
          <ResourcesManagement
            resources={filteredResources}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onAddResource={onAddResource}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
            onEditCategories={onEditCategories}
            onReorderResources={onReorderResources}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={onCategorySelect}
          />
        </Suspense>
      )}

      {adminTab === 'analytics' && (
        <Suspense fallback={<FullPageSpinner />}>
          <AnalyticsDashboard currentUser={currentUser} />
        </Suspense>
      )}

      {adminTab === 'activity' && (isSuperAdmin || isSpecialtyAdmin) && (
        <Suspense fallback={<FullPageSpinner />}>
          <AdminActivityPanel currentUser={currentUser} />
        </Suspense>
      )}

      {adminTab === 'roles' && isSuperAdmin && (
        <Suspense fallback={<FullPageSpinner />}>
          <RoleManagementPanel currentUser={currentUser} />
        </Suspense>
      )}

      {adminTab === 'sponsorship' && (isSuperAdmin || isSpecialtyAdmin) && (
        <Suspense fallback={<FullPageSpinner />}>
          <SponsorshipInquiriesPanel currentUser={currentUser} />
        </Suspense>
      )}

      {adminTab === 'messages' && (
        <Suspense fallback={<FullPageSpinner />}>
          <MessagingPanel currentUser={currentUser} />
        </Suspense>
      )}
    </div>
  );
}

// Memoize AdminView to prevent unnecessary re-renders
export default memo(AdminView);
