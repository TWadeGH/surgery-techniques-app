import React from 'react';

export default function SessionStats() {
  return (
    <div className="glass rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Privacy & Trust</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        All analytics are aggregated and de-identified. Individual surgeon behavior is never tracked or shared.
        Industry reports require minimum cohort size of N=10 surgeons.
      </p>
    </div>
  );
}
