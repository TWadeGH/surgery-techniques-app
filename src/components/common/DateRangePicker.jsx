import React, { useMemo, useCallback } from 'react';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

function toDateString(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function DateRangePicker({ value, onChange }) {
  const activeDays = useMemo(() => {
    if (!value) return 30;
    return Math.round((new Date(value.end) - new Date(value.start)) / (1000 * 60 * 60 * 24));
  }, [value]);

  const startStr = useMemo(() => toDateString(value?.start), [value?.start]);
  const endStr = useMemo(() => toDateString(value?.end), [value?.end]);

  const handlePreset = useCallback((days) => {
    const now = Date.now();
    onChange({
      start: new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(now).toISOString(),
    });
  }, [onChange]);

  const handleCustom = useCallback((field, dateStr) => {
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return;
    onChange({
      start: field === 'start' ? d.toISOString() : (value?.start || new Date().toISOString()),
      end: field === 'end' ? d.toISOString() : (value?.end || new Date().toISOString()),
    });
  }, [onChange, value?.start, value?.end]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => handlePreset(p.days)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            activeDays === p.days
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1 ml-2">
        <input
          type="date"
          value={startStr}
          onChange={e => handleCustom('start', e.target.value)}
          className="px-2 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <span className="text-gray-400 text-sm">-</span>
        <input
          type="date"
          value={endStr}
          onChange={e => handleCustom('end', e.target.value)}
          className="px-2 py-1 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
}
