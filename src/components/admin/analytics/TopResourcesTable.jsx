import React from 'react';
import DataTable from '../../common/DataTable';

const COLUMNS = [
  { key: 'rank', label: '#', sortable: false, render: (_, row) => row._rank },
  { key: 'title', label: 'Resource', render: v => v || 'Unknown' },
  { key: 'views', label: 'Views' },
  { key: 'favorites', label: 'Favs' },
  { key: 'avgDuration', label: 'Avg Time', render: v => `${(v || 0).toFixed(1)}m` },
  { key: 'completionRate', label: 'Completion', render: v => `${(v || 0).toFixed(0)}%` },
];

export default function TopResourcesTable({ data }) {
  const rows = (data || []).map((r, i) => ({
    ...r,
    _rank: i + 1,
    avgDuration: r.views > 0 ? r.totalDuration / r.views / 60 : 0,
    completionRate: r.views > 0 ? (r.completions / r.views) * 100 : 0,
  }));

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Resources</h3>
      <DataTable columns={COLUMNS} data={rows} defaultSort="views" defaultAsc={false} emptyMessage="No resource data" />
    </div>
  );
}
