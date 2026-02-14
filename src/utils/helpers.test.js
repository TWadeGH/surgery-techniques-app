/**
 * Unit Tests for helpers.js
 * Tests utility functions for correctness
 */

import { describe, it, expect } from 'vitest';
import {
  isAdmin,
  isSurgeon,
  isTrainee,
  canRateOrFavorite,
  formatDate,
  formatDateTime,
  truncate,
  groupBy,
  sortBy,
  capitalize,
  getInitials,
} from './helpers';
import { USER_TYPES, USER_ROLES } from './constants';

describe('helpers.js', () => {
  describe('isAdmin', () => {
    it('should return true for super_admin', () => {
      const user = { role: USER_ROLES.SUPER_ADMIN };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return true for specialty_admin', () => {
      const user = { role: USER_ROLES.SPECIALTY_ADMIN };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return true for subspecialty_admin', () => {
      const user = { role: USER_ROLES.SUBSPECIALTY_ADMIN };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return false for regular user', () => {
      const user = { role: null };
      expect(isAdmin(user)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isSurgeon', () => {
    it('should return true for surgeon userType', () => {
      const user = { userType: 'surgeon' };
      expect(isSurgeon(user)).toBe(true);
    });

    it('should return false for non-surgeon', () => {
      const user = { userType: 'trainee' };
      expect(isSurgeon(user)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isSurgeon(null)).toBe(false);
      expect(isSurgeon({})).toBe(false);
    });
  });

  describe('isTrainee', () => {
    it('should return true for trainee userType', () => {
      const user = { userType: 'trainee' };
      expect(isTrainee(user)).toBe(true);
    });

    it('should return false for non-trainee', () => {
      const user = { userType: 'surgeon' };
      expect(isTrainee(user)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isTrainee(null)).toBe(false);
      expect(isTrainee({})).toBe(false);
    });
  });

  describe('canRateOrFavorite', () => {
    it('should return true for attending', () => {
      const user = { userType: USER_TYPES.ATTENDING };
      expect(canRateOrFavorite(user)).toBe(true);
    });

    it('should return true for resident', () => {
      const user = { userType: USER_TYPES.RESIDENT };
      expect(canRateOrFavorite(user)).toBe(true);
    });

    it('should return true for fellow', () => {
      const user = { userType: USER_TYPES.FELLOW };
      expect(canRateOrFavorite(user)).toBe(true);
    });

    it('should return false for medical student', () => {
      const user = { userType: USER_TYPES.MEDICAL_STUDENT };
      expect(canRateOrFavorite(user)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(canRateOrFavorite(null)).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-01-24T10:30:00Z');
      const formatted = formatDate(date);
      // formatDate returns "Jan 24, 2026" style via toLocaleDateString month:'short'
      expect(formatted).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
    });

    it('should handle string dates', () => {
      const dateString = '2026-01-24T10:30:00Z';
      const formatted = formatDate(dateString);
      expect(formatted).toBeTruthy();
    });

    it('should return empty string for invalid date', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2026-01-24T10:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toMatch(/\d{1,2}/); // Should contain numbers
    });

    it('should handle string dates', () => {
      const dateString = '2026-01-24T10:30:00Z';
      const formatted = formatDateTime(dateString);
      expect(formatted).toBeTruthy();
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime('invalid')).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(150);
      const truncated = truncate(longText, 100);
      expect(truncated.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(truncated).toMatch(/\.\.\.$/);
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncate(shortText, 100)).toBe(shortText);
    });

    it('should handle empty string', () => {
      expect(truncate('', 100)).toBe('');
    });
  });

  describe('sortBy', () => {
    it('should sort array by key ascending', () => {
      const items = [
        { value: 3 },
        { value: 1 },
        { value: 2 },
      ];
      const sorted = sortBy(items, 'value', true);
      expect(sorted[0].value).toBe(1);
      expect(sorted[1].value).toBe(2);
      expect(sorted[2].value).toBe(3);
    });

    it('should sort array by key descending', () => {
      const items = [
        { value: 1 },
        { value: 3 },
        { value: 2 },
      ];
      const sorted = sortBy(items, 'value', false);
      expect(sorted[0].value).toBe(3);
      expect(sorted[1].value).toBe(2);
      expect(sorted[2].value).toBe(1);
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('getInitials', () => {
    it('should get initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane')).toBe('J');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });

  describe('groupBy', () => {
    it('should group items by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const grouped = groupBy(items, 'category');
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });

    it('should handle empty array', () => {
      expect(groupBy([], 'key')).toEqual({});
    });
  });
});
