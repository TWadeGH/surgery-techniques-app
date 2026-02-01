import React from 'react';
import { TrendingUp, Heart, Clock, MousePointer, CheckCircle, Users } from 'lucide-react';

const CARDS = [
  { key: 'totalViews', label: 'Total Views', icon: TrendingUp, color: 'text-purple-600', format: v => v?.toLocaleString() || '0' },
  { key: 'uniqueUsers', label: 'Unique Resources', icon: Users, color: 'text-blue-600', format: v => v?.toLocaleString() || '0' },
  { key: 'totalFavorites', label: 'Favorites', icon: Heart, color: 'text-red-500', format: v => v?.toLocaleString() || '0' },
  { key: 'avgDuration', label: 'Avg Duration', icon: Clock, color: 'text-green-600', format: v => `${(v || 0).toFixed(1)}m` },
  { key: 'avgScroll', label: 'Avg Scroll Depth', icon: MousePointer, color: 'text-orange-500', format: v => `${(v || 0).toFixed(0)}%` },
  { key: 'completionRate', label: 'Completion Rate', icon: CheckCircle, color: 'text-teal-600', format: v => `${(v || 0).toFixed(0)}%` },
];

export default function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map((card) => (
        <div key={card.key} className="glass rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">{card.label}</h4>
            <card.icon size={16} className={card.color} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.format(summary?.[card.key])}</p>
        </div>
      ))}
    </div>
  );
}
