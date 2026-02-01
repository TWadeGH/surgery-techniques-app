import React, { useState } from 'react';
import { USER_ROLES } from '../../../utils/constants';
import { useAnalytics } from '../../../hooks/useAnalytics';
import DateRangePicker from '../../common/DateRangePicker';
import SummaryCards from './SummaryCards';
import ViewsChart from './ViewsChart';
import FavoritesChart from './FavoritesChart';
import TopResourcesTable from './TopResourcesTable';
import SpecialtyBreakdown from './SpecialtyBreakdown';
import SessionStats from './SessionStats';

export default function AnalyticsDashboard({ currentUser }) {
  const [dateRange, setDateRange] = useState(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  }));
  const [groupBy, setGroupBy] = useState('day');

  const isSuperAdmin = currentUser?.role === USER_ROLES.SUPER_ADMIN;
  const isSubspecialtyAdmin = currentUser?.role === USER_ROLES.SUBSPECIALTY_ADMIN;

  const {
    summary,
    viewsOverTime,
    favoritesOverTime,
    topResources,
    bySpecialty,
    bySubspecialty,
    loading,
  } = useAnalytics({ currentUser, dateRange, groupBy });

  if (loading) {
    return (
      <div className="glass rounded-2xl p-16 text-center shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {['day', 'week', 'month'].map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                groupBy === g
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViewsChart data={viewsOverTime} />
        <FavoritesChart data={favoritesOverTime} />
      </div>

      <TopResourcesTable data={topResources} />

      {!isSubspecialtyAdmin && (
        <SpecialtyBreakdown
          bySpecialty={bySpecialty}
          bySubspecialty={bySubspecialty}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      <SessionStats />
    </div>
  );
}
