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
 * Validate password
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  
  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    return { valid: false, error: VALIDATION.PASSWORD.MESSAGE };
  }
  
  return { valid: true, error: null };
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
