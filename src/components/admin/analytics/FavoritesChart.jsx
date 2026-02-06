import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FavoritesChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No favorites data for this period</p>;
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Favorites Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Favorites" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
