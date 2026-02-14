/**
 * Helper Utilities
 * Common helper functions used throughout the application
 */

import { USER_ROLES, ADMIN_ROLES } from './constants';

/**
 * Check if a user has an admin role
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user || !user.role) return false;
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Check if a user has a specific role
 * @param {Object} user - User object
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function hasRole(user, role) {
  return user?.role === role;
}

/**
 * Check if user is a surgeon (attending/consultant)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isSurgeon(user) {
  return user?.userType === 'surgeon';
}

/**
 * Check if user is a trainee (resident/fellow)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isTrainee(user) {
  return user?.userType === 'trainee';
}

/** Allowlisted user types that can use favorites, notes, ratings, upcoming cases (all 4 onboarding options). */
const USER_TYPES_CAN_INTERACT = ['surgeon', 'attending', 'trainee', 'resident', 'fellow', 'industry', 'student', 'other'];

/**
 * Check if user can rate/favorite/use notes/upcoming cases.
 * Security: Allowlist only; all four onboarding options (Surgeon, Resident/Fellow, Industry, Student/Other) are allowed.
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function canRateOrFavorite(user) {
  if (!user?.userType || typeof user.userType !== 'string') return false;
  const type = user.userType.toLowerCase().trim();
  return USER_TYPES_CAN_INTERACT.includes(type);
}

/**
 * Whether to include this user in analytics (Surgeon and Resident/Fellow only).
 * Security: Used to gate tracking calls; no PII in analytics.
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function includeInAnalytics(user) {
  return isSurgeon(user) || isTrainee(user);
}

/**
 * Format a date to a readable string
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function with flush() method
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  const debouncedFn = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  // Add flush method to execute immediately
  debouncedFn.flush = function() {
    clearTimeout(timeout);
    // Note: flush() executes the last call immediately, but we need the args
    // For now, flush just clears the timeout - the actual save will happen
    // via immediate save in updateNote when immediate=true
  };
  
  // Add cancel method to cancel pending execution
  debouncedFn.cancel = function() {
    clearTimeout(timeout);
  };
  
  return debouncedFn;
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*}
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Remove duplicates from an array
 * @param {Array} arr - Array to deduplicate
 * @param {string} key - Optional key for objects
 * @returns {Array}
 */
export function removeDuplicates(arr, key = null) {
  if (!Array.isArray(arr)) return [];
  
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(arr)];
}

/**
 * Sort array by key
 * @param {Array} arr - Array to sort
 * @param {string} key - Key to sort by
 * @param {boolean} ascending - Sort direction
 * @returns {Array}
 */
export function sortBy(arr, key, ascending = true) {
  if (!Array.isArray(arr)) return [];
  
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return ascending ? comparison : -comparison;
  });
}

/**
 * Group array by key
 * @param {Array} arr - Array to group
 * @param {string|Function} key - Key or function to group by
 * @returns {Object}
 */
export function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
export function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null}
 */
export function getYoutubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if code is running in browser
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Get value from local storage safely
 * @param {string} key - Storage key
 * @param {*} fallback - Fallback value
 * @returns {*}
 */
export function getLocalStorage(key, fallback = null) {
  if (!isBrowser()) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Set value in local storage safely
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean}
 */
export function setLocalStorage(key, value) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove item from local storage
 * @param {string} key - Storage key
 * @returns {boolean}
 */
export function removeLocalStorage(key) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
