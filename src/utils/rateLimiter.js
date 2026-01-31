/**
 * Rate Limiter Utility
 * Security: Prevents DoS attacks and abuse by limiting request frequency
 * 
 * Uses localStorage to track attempts (client-side defense)
 * Note: Server-side rate limiting should also be implemented in Supabase
 */

const RATE_LIMIT_CONFIG = {
  SIGN_UP: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    KEY_PREFIX: 'signup_attempts_',
  },
  LOGIN: {
    MAX_ATTEMPTS: 10,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    KEY_PREFIX: 'login_attempts_',
  },
  PASSWORD_RESET: {
    MAX_ATTEMPTS: 3,
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    KEY_PREFIX: 'password_reset_attempts_',
  },
};

/**
 * Check if rate limit is exceeded
 * @param {string} type - Type of action ('SIGN_UP', 'LOGIN', 'PASSWORD_RESET')
 * @param {string} identifier - Email or IP address to track
 * @returns {{allowed: boolean, remainingAttempts: number, resetAt: Date|null}}
 */
export function checkRateLimit(type, identifier) {
  if (typeof window === 'undefined') {
    // Server-side: always allow (server should handle rate limiting)
    return { allowed: true, remainingAttempts: Infinity, resetAt: null };
  }

  const config = RATE_LIMIT_CONFIG[type];
  if (!config) {
    console.warn(`Unknown rate limit type: ${type}`);
    return { allowed: true, remainingAttempts: Infinity, resetAt: null };
  }

  const key = `${config.KEY_PREFIX}${identifier}`;
  const now = Date.now();
  
  try {
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      // No previous attempts
      return { allowed: true, remainingAttempts: config.MAX_ATTEMPTS, resetAt: new Date(now + config.WINDOW_MS) };
    }

    const data = JSON.parse(stored);
    const { attempts, firstAttempt } = data;

    // Check if window has expired
    if (now - firstAttempt > config.WINDOW_MS) {
      // Window expired, reset
      localStorage.removeItem(key);
      return { allowed: true, remainingAttempts: config.MAX_ATTEMPTS, resetAt: new Date(now + config.WINDOW_MS) };
    }

    // Check if limit exceeded
    if (attempts >= config.MAX_ATTEMPTS) {
      const resetAt = new Date(firstAttempt + config.WINDOW_MS);
      return { allowed: false, remainingAttempts: 0, resetAt };
    }

    // Still within limit
    return { 
      allowed: true, 
      remainingAttempts: config.MAX_ATTEMPTS - attempts,
      resetAt: new Date(firstAttempt + config.WINDOW_MS)
    };
  } catch (error) {
    // If localStorage fails, allow (fail open for UX, but log error)
    console.error('Rate limit check failed:', error);
    return { allowed: true, remainingAttempts: Infinity, resetAt: null };
  }
}

/**
 * Record an attempt
 * @param {string} type - Type of action
 * @param {string} identifier - Email or IP address
 */
export function recordAttempt(type, identifier) {
  if (typeof window === 'undefined') {
    return; // Server-side: don't track in localStorage
  }

  const config = RATE_LIMIT_CONFIG[type];
  if (!config) {
    return;
  }

  const key = `${config.KEY_PREFIX}${identifier}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      // First attempt
      localStorage.setItem(key, JSON.stringify({
        attempts: 1,
        firstAttempt: now,
      }));
      return;
    }

    const data = JSON.parse(stored);
    
    // Check if window expired
    if (now - data.firstAttempt > config.WINDOW_MS) {
      // Reset window
      localStorage.setItem(key, JSON.stringify({
        attempts: 1,
        firstAttempt: now,
      }));
      return;
    }

    // Increment attempts
    data.attempts = (data.attempts || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // If localStorage fails, silently continue (fail open for UX)
    console.error('Rate limit recording failed:', error);
  }
}

/**
 * Clear rate limit for an identifier (useful for testing or after successful action)
 * @param {string} type - Type of action
 * @param {string} identifier - Email or IP address
 */
export function clearRateLimit(type, identifier) {
  if (typeof window === 'undefined') {
    return;
  }

  const config = RATE_LIMIT_CONFIG[type];
  if (!config) {
    return;
  }

  const key = `${config.KEY_PREFIX}${identifier}`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear rate limit:', error);
  }
}

/**
 * Format time until reset (for user-friendly error messages)
 * @param {Date} resetAt - When the rate limit resets
 * @returns {string} Human-readable time string
 */
export function formatTimeUntilReset(resetAt) {
  if (!resetAt) return '';
  
  const now = Date.now();
  const msUntilReset = resetAt.getTime() - now;
  
  if (msUntilReset <= 0) return 'now';
  
  const minutes = Math.ceil(msUntilReset / (60 * 1000));
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}
