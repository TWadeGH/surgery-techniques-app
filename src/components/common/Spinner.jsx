/**
 * Spinner Component
 * Loading spinner with multiple variants and sizes
 * 
 * Production-grade loading indicators
 */

import React from 'react';

/**
 * Spinner Component
 * 
 * @param {Object} props
 * @param {string} props.size - Size (sm, md, lg, xl)
 * @param {string} props.color - Color (primary, white, gray)
 * @param {string} props.label - Accessibility label
 * @param {boolean} props.center - Whether to center in container
 * @param {string} props.className - Additional CSS classes
 */
export default function Spinner({
  size = 'md',
  color = 'primary',
  label = 'Loading...',
  center = false,
  className = '',
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorClasses = {
    primary: 'border-purple-600',
    white: 'border-white',
    gray: 'border-gray-600',
  };

  const spinnerClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className}`;
  const containerClasses = center ? 'flex items-center justify-center' : '';

  return (
    <div className={containerClasses} role="status" aria-label={label}>
      <svg
        className={`animate-spin ${spinnerClasses}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * FullPageSpinner Component
 * Full-page loading overlay
 */
export function FullPageSpinner({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center z-50">
      <Spinner size="xl" />
      {message && (
        <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * InlineSpinner Component
 * Small inline spinner for buttons or inline use
 */
export function InlineSpinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * LoadingSkeleton Component
 * Skeleton loader for content placeholders
 */
export function LoadingSkeleton({ 
  count = 1, 
  height = 'h-4', 
  className = '' 
}) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 rounded ${height} ${className}`}
        />
      ))}
    </div>
  );
}

/**
 * CardSkeleton Component
 * Skeleton for card layouts
 */
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass rounded-2xl p-6 animate-pulse"
        >
          <div className="flex gap-6">
            {/* Image placeholder */}
            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
            
            {/* Content placeholder */}
            <div className="flex-1 space-y-3">
              {/* Title */}
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              
              {/* Description lines */}
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              
              {/* Button placeholders */}
              <div className="flex gap-2 pt-4">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
