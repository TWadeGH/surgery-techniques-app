/**
 * Validation Utilities
 * Functions for validating user input
 */

import { VALIDATION, IMAGE_UPLOAD } from './constants';

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email is required.' };
  }
  
  if (!VALIDATION.EMAIL.PATTERN.test(email)) {
    return { valid: false, error: VALIDATION.EMAIL.MESSAGE };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate password with strength requirements
 * Security: Enforces complexity to prevent weak passwords
 * @param {string} password - Password to validate
 * @param {boolean} requireStrength - Whether to enforce strength requirements (default: true for sign-up)
 * @returns {{valid: boolean, error: string|null, strength?: 'weak'|'medium'|'strong'}}
 */
export function validatePassword(password, requireStrength = false) {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  
  // Basic length check
  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    return { valid: false, error: VALIDATION.PASSWORD.MESSAGE };
  }
  
  // If strength requirements not needed (e.g., login), just check length
  if (!requireStrength) {
    return { valid: true, error: null };
  }
  
  // Security: Password strength requirements (for sign-up)
  // Minimum 8 characters (increased from 6 for better security)
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  
  // Check for required character types
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  // Calculate strength
  let strength = 'weak';
  let strengthScore = 0;
  if (password.length >= 8) strengthScore++;
  if (hasUpperCase) strengthScore++;
  if (hasLowerCase) strengthScore++;
  if (hasNumber) strengthScore++;
  if (hasSpecialChar) strengthScore++;
  if (password.length >= 12) strengthScore++;
  
  if (strengthScore >= 5) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';
  
  // Require: uppercase, lowercase, and number (minimum)
  if (!hasUpperCase) {
    return { valid: false, error: 'Password must include at least one uppercase letter.' };
  }
  
  if (!hasLowerCase) {
    return { valid: false, error: 'Password must include at least one lowercase letter.' };
  }
  
  if (!hasNumber) {
    return { valid: false, error: 'Password must include at least one number.' };
  }
  
  // Optional: recommend special character for stronger passwords
  // (Not required, but encouraged)
  
  return { valid: true, error: null, strength };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL is required.' };
  }
  
  if (!VALIDATION.RESOURCE_URL.PATTERN.test(url)) {
    return { valid: false, error: VALIDATION.RESOURCE_URL.MESSAGE };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate resource title
 * @param {string} title - Title to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateResourceTitle(title) {
  if (!title || !title.trim()) {
    return { valid: false, error: 'Title is required.' };
  }
  
  if (title.length > VALIDATION.RESOURCE_TITLE.MAX_LENGTH) {
    return { valid: false, error: VALIDATION.RESOURCE_TITLE.MESSAGE };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate note content
 * @param {string} note - Note content to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateNote(note) {
  if (note && note.length > VALIDATION.NOTE.MAX_LENGTH) {
    return { valid: false, error: VALIDATION.NOTE.MESSAGE };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  
  // Check file size
  if (file.size > IMAGE_UPLOAD.MAX_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${IMAGE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB.`,
    };
  }
  
  // Check file type
  if (!IMAGE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${IMAGE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate resource form data
 * @param {Object} data - Form data to validate
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateResourceForm(data) {
  const errors = {};
  
  const titleValidation = validateResourceTitle(data.title);
  if (!titleValidation.valid) {
    errors.title = titleValidation.error;
  }
  
  const urlValidation = validateUrl(data.url);
  if (!urlValidation.valid) {
    errors.url = urlValidation.error;
  }
  
  if (!data.category_id && !data.procedure_id) {
    errors.category = 'Either category or procedure must be selected.';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate user profile data
 * @param {Object} data - Profile data to validate
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateProfileForm(data) {
  const errors = {};
  
  if (!data.email) {
    errors.email = 'Email is required.';
  } else {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
    }
  }
  
  if (!data.user_type) {
    errors.user_type = 'User type is required.';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Validate and sanitize user input
 * @param {string} input - User input
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (!input) return '';
  
  // Remove any HTML tags
  const sanitized = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  const trimmed = sanitized.trim();
  
  // Enforce max length
  return trimmed.substring(0, maxLength);
}

/**
 * Validate UUID format
 * Security: Prevents injection attacks and ensures valid UUID format
 * @param {string|null} uuid - UUID to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateUuid(uuid) {
  // Allow null/undefined
  if (uuid === null || uuid === undefined || uuid === '') {
    return { valid: true, error: null };
  }
  
  // Type check: must be string
  if (typeof uuid !== 'string') {
    return { valid: false, error: 'Invalid UUID type.' };
  }
  
  // Length check: UUIDs are exactly 36 characters (with hyphens)
  if (uuid.length !== 36) {
    return { valid: false, error: 'Invalid UUID length.' };
  }
  
  // Format check: UUID pattern (8-4-4-4-12 hexadecimal digits)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format.' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate category ID
 * Security: Prevents injection attacks and ensures category exists in allowed list
 * @param {string|null} categoryId - Category ID to validate
 * @param {Array} allowedCategories - Array of allowed category objects
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateCategoryId(categoryId, allowedCategories = []) {
  // Allow null (for "All Categories" selection)
  if (categoryId === null || categoryId === undefined) {
    return { valid: true, error: null };
  }
  
  // Type check: must be string
  if (typeof categoryId !== 'string') {
    return { valid: false, error: 'Invalid category ID type.' };
  }
  
  // Length check: prevent DoS with extremely long strings
  if (categoryId.length > 100) {
    return { valid: false, error: 'Category ID exceeds maximum length.' };
  }
  
  // Defense in depth: verify category exists in allowed list
  // This prevents selecting categories the user shouldn't have access to
  if (allowedCategories.length > 0) {
    const categoryExists = allowedCategories.some(cat => {
      // Check main category
      if (cat.id === categoryId) return true;
      // Check subcategories
      if (cat.subcategories && cat.subcategories.some(sub => sub.id === categoryId)) return true;
      return false;
    });
    
    if (!categoryExists) {
      console.warn('Category ID not found in allowed categories list:', categoryId);
      return { valid: false, error: 'Category not found in allowed list.' };
    }
  }
  
  return { valid: true, error: null };
}
