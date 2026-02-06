import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ViewsChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">No view data for this period</p>;
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Views Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} name="Views" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
