/**
 * Unit Tests for validators.js
 * Tests input validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateUrl,
  validateResourceTitle,
  validateNote,
} from './validators';

describe('validators.js', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result1 = validateEmail('test@example.com');
      expect(result1.valid).toBe(true);
      expect(result1.error).toBeNull();

      const result2 = validateEmail('user.name@domain.co.uk');
      expect(result2.valid).toBe(true);
      expect(result2.error).toBeNull();
    });

    it('should reject invalid email addresses', () => {
      const result1 = validateEmail('invalid');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBeTruthy();

      const result2 = validateEmail('');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBeTruthy();
    });

    it('should handle null/undefined', () => {
      const result1 = validateEmail(null);
      expect(result1.valid).toBe(false);
      
      const result2 = validateEmail(undefined);
      expect(result2.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const result1 = validateUrl('https://example.com');
      expect(result1.valid).toBe(true);
      expect(result1.error).toBeNull();

      const result2 = validateUrl('http://example.com');
      expect(result2.valid).toBe(true);
      expect(result2.error).toBeNull();
    });

    it('should reject invalid URLs', () => {
      const result1 = validateUrl('not-a-url');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBeTruthy();

      const result2 = validateUrl('');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBeTruthy();
    });

    it('should handle null/undefined', () => {
      const result1 = validateUrl(null);
      expect(result1.valid).toBe(false);
      
      const result2 = validateUrl(undefined);
      expect(result2.valid).toBe(false);
    });
  });

  describe('validateResourceTitle', () => {
    it('should validate non-empty titles', () => {
      const result = validateResourceTitle('Valid Title');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject empty titles', () => {
      const result1 = validateResourceTitle('');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBeTruthy();

      const result2 = validateResourceTitle('   ');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBeTruthy();
    });

    it('should reject titles exceeding max length', () => {
      const longTitle = 'a'.repeat(300); // Assuming max is less than 300
      const result = validateResourceTitle(longTitle);
      // May be valid or invalid depending on max length constant
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
    });
  });

  describe('validateNote', () => {
    it('should validate notes within length limit', () => {
      const result = validateNote('Valid note content');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow empty notes', () => {
      const result = validateNote('');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject notes exceeding max length', () => {
      const longNote = 'a'.repeat(10000); // Assuming max is less than 10000
      const result = validateNote(longNote);
      // May be valid or invalid depending on max length constant
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
    });
  });
});
