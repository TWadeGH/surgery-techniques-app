import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#9333ea', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function SpecialtyBreakdown({ bySpecialty, bySubspecialty, onDrillDown, isSuperAdmin }) {
  const data = isSuperAdmin && bySpecialty?.length ? bySpecialty : bySubspecialty || [];
  const label = isSuperAdmin && bySpecialty?.length ? 'Views by Specialty' : 'Views by Subspecialty';

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{label}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
            <Tooltip />
            <Bar
              dataKey="count"
              name="Views"
              radius={[0, 4, 4, 0]}
              onClick={(entry) => onDrillDown?.(entry.id)}
              cursor={onDrillDown ? 'pointer' : 'default'}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
