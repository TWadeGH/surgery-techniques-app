
/**
 * Application Constants
 * Centralized location for all constant values used throughout the app
 */

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  SPECIALTY_ADMIN: 'specialty_admin',
  SUBSPECIALTY_ADMIN: 'subspecialty_admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const ADMIN_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.SPECIALTY_ADMIN,
  USER_ROLES.SUBSPECIALTY_ADMIN,
  USER_ROLES.ADMIN,
];

// Specialty/subspecialty display names for special-case logic (case-insensitive match)
export const SPECIALTY_SUBSPECIALTY = {
  GENERALIST: 'generalist', // subspecialty: see all resources for all subspecialties
  PODIATRY: 'podiatry', // specialty with no subspecialty; view = Orthopaedic Surgery + Foot and Ankle
  ORTHOPAEDIC_SURGERY: 'orthopaedic surgery', // UK spelling
  ORTHOPEDIC_SURGERY: 'orthopedic surgery', // US spelling
  FOOT_AND_ANKLE: 'foot and ankle',
};

// User Types
export const USER_TYPES = {
  STUDENT: 'student',
  RESIDENT: 'resident',
  FELLOW: 'fellow',
  ATTENDING: 'attending',
  SURGEON: 'surgeon', // Alias for attending/surgeon
  TRAINEE: 'trainee', // Alias for resident/fellow
  INDUSTRY: 'industry',
  OTHER: 'other',
};

// Resource Types (content type)
export const RESOURCE_TYPES = {
  VIDEO: 'video',
  ARTICLE: 'article',
  DOCUMENT: 'document',
  IMAGE: 'image',
  GUIDE: 'guide',
  PODCAST: 'podcast',
};

// Source type for linked resources (where the content is hosted)
export const SOURCE_TYPES = {
  YOUTUBE: 'youtube',
  MANUFACTURER: 'manufacturer',
  JOURNAL: 'journal',
  INSTITUTION: 'institution',
  VIMEO: 'vimeo',
  OTHER: 'other',
};

// Display labels for "View on [Source]" button and source line
export const SOURCE_DISPLAY = {
  [SOURCE_TYPES.YOUTUBE]: 'YouTube',
  [SOURCE_TYPES.MANUFACTURER]: 'Manufacturer Site',
  [SOURCE_TYPES.JOURNAL]: 'Journal',
  [SOURCE_TYPES.INSTITUTION]: 'Institutional Site',
  [SOURCE_TYPES.VIMEO]: 'Vimeo',
  [SOURCE_TYPES.OTHER]: 'External Site',
};

// Content type display labels
export const CONTENT_TYPE_LABELS = {
  video: 'Video',
  article: 'Article',
  document: 'Document',
  pdf: 'PDF / Guide',
  guide: 'Guide',
  podcast: 'Podcast',
  image: 'Image',
};

// View Modes
export const VIEW_MODES = {
  USER: 'user',
  ADMIN: 'admin',
};

// Admin Tabs
export const ADMIN_TABS = {
  RESOURCES: 'resources',
  ANALYTICS: 'analytics',
  CATEGORIES: 'categories',
  PROCEDURES: 'procedures',
  SUGGESTIONS: 'suggestions',
};

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Timing Constants (in milliseconds)
export const TIMING = {
  OAUTH_CALLBACK_DELAY: 500,
  LOADING_TIMEOUT: 5000,
  DEBOUNCE_SEARCH: 300,
  TOAST_DURATION: 3000,
  ANALYTICS_SESSION_TIMEOUT: 1800000, // 30 minutes
};

// Storage Keys
export const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  AUTH_TOKEN: 'authToken',
  USER_PREFERENCES: 'userPreferences',
};

// Query Keys (for React Query)
export const QUERY_KEYS = {
  USER: 'user',
  RESOURCES: 'resources',
  FAVORITES: 'favorites',
  NOTES: 'notes',
  UPCOMING_CASES: 'upcomingCases',
  CATEGORIES: 'categories',
  PROCEDURES: 'procedures',
  SPECIALTIES: 'specialties',
  SUBSPECIALTIES: 'subspecialties',
  SUGGESTIONS: 'suggestions',
  ANALYTICS: 'analytics',
};

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    LOGIN_FAILED: 'Failed to log in. Please check your credentials.',
    LOGOUT_FAILED: 'Failed to log out. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
    OAUTH_FAILED: 'Failed to authenticate with Google. Please try again.',
  },
  RESOURCE: {
    LOAD_FAILED: 'Failed to load resources. Please refresh the page.',
    CREATE_FAILED: 'Failed to create resource. Please try again.',
    UPDATE_FAILED: 'Failed to update resource. Please try again.',
    DELETE_FAILED: 'Failed to delete resource. Please try again.',
  },
  FAVORITE: {
    ADD_FAILED: 'Failed to add to favorites. Please try again.',
    REMOVE_FAILED: 'Failed to remove from favorites. Please try again.',
  },
  NOTE: {
    SAVE_FAILED: 'Failed to save note. Please try again.',
    DELETE_FAILED: 'Failed to delete note. Please try again.',
  },
  GENERIC: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
  // Shorthand aliases for hooks compatibility
  AUTH_ERROR: 'Authentication failed. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  RESOURCE: {
    CREATED: 'Resource created successfully!',
    UPDATED: 'Resource updated successfully!',
    DELETED: 'Resource deleted successfully!',
  },
  FAVORITE: {
    ADDED: 'Added to favorites!',
    REMOVED: 'Removed from favorites!',
  },
  NOTE: {
    SAVED: 'Note saved successfully!',
    DELETED: 'Note deleted successfully!',
  },
  PROFILE: {
    UPDATED: 'Profile updated successfully!',
  },
};

// Validation Rules
export const VALIDATION = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address.',
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MESSAGE: 'Password must be at least 6 characters.',
  },
  RESOURCE_TITLE: {
    MAX_LENGTH: 200,
    MESSAGE: 'Title must be less than 200 characters.',
  },
  RESOURCE_URL: {
    PATTERN: /^https?:\/\/.+/,
    MESSAGE: 'Please enter a valid URL starting with http:// or https://',
  },
  NOTE: {
    MAX_LENGTH: 5000,
    MESSAGE: 'Note must be less than 5000 characters.',
  },
  REPORT: {
    MAX_LENGTH: 2000,
    MESSAGE: 'Report must be 2000 characters or fewer.',
  },
};

// Note Limits
export const NOTE_LIMITS = {
  MAX_LENGTH: 5000,
  MIN_LENGTH: 0,
};

// Image Upload
export const IMAGE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  RESOURCE_VIEW: 'resource_view',
  RESOURCE_VIEW_END: 'resource_view_end',
  FAVORITE_ADD: 'favorite_add',
  FAVORITE_REMOVE: 'favorite_remove',
  RESOURCE_COVIEW: 'resource_coview',
  SEARCH_QUERY: 'search_query',
  UPCOMING_CASE_ADD: 'upcoming_case_add',
  UPCOMING_CASE_REMOVE: 'upcoming_case_remove',
  RATING_SUBMIT: 'rating_submit',
  CATEGORY_SELECT: 'category_select',
  RESOURCE_SUGGEST: 'resource_suggest',
  SPONSORED_ENGAGEMENT: 'sponsored_engagement',
};

// Feature Flags (can be moved to env variables later)
export const FEATURES = {
  GOOGLE_AUTH: true,
  ANALYTICS: true,
  DARK_MODE: true,
  UPCOMING_CASES: true,
  RESOURCE_SUGGESTIONS: true,
  ADMIN_DASHBOARD: true,
};

// Route Paths (when routing is added)
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

// Legal / DMCA disclosure for external links (third-party content)
export const EXTERNAL_LINK_DISCLOSURE = {
  MODAL_TITLE: 'You are leaving Surgery Techniques',
  MODAL_BODY: 'You will be redirected to an external site.',
  CARD_DISCLAIMER: 'This content is hosted on a third-party site. Surgery Techniques App is not responsible for the accuracy, completeness, or legality of third-party content.',
  COPYRIGHT_REPORT: 'If you believe this link violates copyright, please use "Report Link" or contact us.',
};
