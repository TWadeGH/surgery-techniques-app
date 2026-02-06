import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Reusable sortable data table.
 *
 * @param {Object} props
 * @param {Array<{key:string, label:string, sortable?:boolean, render?:Function}>} props.columns
 * @param {Array} props.data
 * @param {string} [props.defaultSort] - column key
 * @param {boolean} [props.defaultAsc=true]
 * @param {string} [props.emptyMessage]
 */
export default function DataTable({ columns, data, defaultSort, defaultAsc = true, emptyMessage = 'No data' }) {
  const [sortKey, setSortKey] = useState(defaultSort || (columns[0]?.key ?? ''));
  const [asc, setAsc] = useState(defaultAsc);

  function handleSort(key) {
    if (sortKey === key) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const sorted = useMemo(() => {
    if (!data || !sortKey) return data || [];
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }, [data, sortKey, asc]);

  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-purple-600' : ''}`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable !== false && sortKey === col.key && (
                    asc ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2.5 text-gray-900 dark:text-gray-100">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
