import { describe, it, expect } from 'vitest';
import {
  isEmail,
  nonEmptyString,
  isHexColor,
  isTimezone,
  isPositiveIntArray,
  parseYmd,
} from '@/lib/validation';

describe('Validation Helpers', () => {
  describe('isEmail', () => {
    it('accepts valid email addresses', () => {
      expect(isEmail('user@example.com')).toBe(true);
      expect(isEmail('admin.test@sub.domain.co')).toBe(true);
      expect(isEmail('operador+1@empresa.com.ar')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(isEmail('')).toBe(false);
      expect(isEmail('   ')).toBe(false);
      expect(isEmail('notanemail')).toBe(false);
      expect(isEmail('@example.com')).toBe(false);
      expect(isEmail('user@')).toBe(false);
      expect(isEmail('user@domain')).toBe(false);
      expect(isEmail(null)).toBe(false);
      expect(isEmail(undefined)).toBe(false);
      expect(isEmail(12345)).toBe(false);
      expect(isEmail('a'.repeat(250) + '@example.com')).toBe(false); // > 254 chars
    });
  });

  describe('nonEmptyString', () => {
    it('accepts non-empty strings within max length', () => {
      expect(nonEmptyString('hello')).toBe(true);
      expect(nonEmptyString('  trimmed  ')).toBe(true);
      expect(nonEmptyString('test', 4)).toBe(true);
      expect(nonEmptyString('a', 10)).toBe(true);
    });

    it('rejects empty or oversized strings', () => {
      expect(nonEmptyString('')).toBe(false);
      expect(nonEmptyString('   ')).toBe(false);
      expect(nonEmptyString('too long string', 5)).toBe(false);
      expect(nonEmptyString(null)).toBe(false);
      expect(nonEmptyString(undefined)).toBe(false);
      expect(nonEmptyString(123)).toBe(false);
    });
  });

  describe('isHexColor', () => {
    it('accepts valid 6-digit hex colors', () => {
      expect(isHexColor('#0F4C5C')).toBe(true);
      expect(isHexColor('#F2A541')).toBe(true);
      expect(isHexColor('#ffffff')).toBe(true);
      expect(isHexColor('#000000')).toBe(true);
      expect(isHexColor('#123ABC')).toBe(true);
    });

    it('rejects invalid hex colors', () => {
      expect(isHexColor('#0F4C5')).toBe(false); // 5 digits
      expect(isHexColor('#0F4C5CG')).toBe(false); // invalid character
      expect(isHexColor('0F4C5C')).toBe(false); // missing #
      expect(isHexColor('#0F4C5C12')).toBe(false); // 8 digits
      expect(isHexColor('')).toBe(false);
      expect(isHexColor(null)).toBe(false);
      expect(isHexColor(undefined)).toBe(false);
    });
  });

  describe('isTimezone', () => {
    it('accepts valid IANA timezones', () => {
      expect(isTimezone('America/Argentina/Buenos_Aires')).toBe(true);
      expect(isTimezone('UTC')).toBe(true);
      expect(isTimezone('Europe/Madrid')).toBe(true);
    });

    it('rejects invalid timezones', () => {
      expect(isTimezone('Mars/Olympus')).toBe(false);
      expect(isTimezone('Invalid/Timezone')).toBe(false);
      expect(isTimezone('')).toBe(false);
      expect(isTimezone(null)).toBe(false);
      expect(isTimezone(undefined)).toBe(false);
      expect(isTimezone(123)).toBe(false);
    });
  });

  describe('isPositiveIntArray', () => {
    it('accepts non-empty arrays of positive integers', () => {
      expect(isPositiveIntArray([1])).toBe(true);
      expect(isPositiveIntArray([1, 2, 3])).toBe(true);
      expect(isPositiveIntArray([1, 2], 2)).toBe(true);
    });

    it('rejects invalid integer arrays', () => {
      expect(isPositiveIntArray([])).toBe(false);
      expect(isPositiveIntArray([0])).toBe(false);
      expect(isPositiveIntArray([-1])).toBe(false);
      expect(isPositiveIntArray([1.5])).toBe(false);
      expect(isPositiveIntArray(['1'])).toBe(false);
      expect(isPositiveIntArray([1, 2, 3], 2)).toBe(false); // exceeds maxLen
      expect(isPositiveIntArray(null)).toBe(false);
      expect(isPositiveIntArray(undefined)).toBe(false);
      expect(isPositiveIntArray('1,2,3')).toBe(false);
    });
  });

  describe('parseYmd', () => {
    it('accepts real calendar dates in YYYY-MM-DD format', () => {
      expect(parseYmd('2026-11-13')).toBe('2026-11-13');
      expect(parseYmd('2026-02-28')).toBe('2026-02-28');
      expect(parseYmd('2024-02-29')).toBe('2024-02-29'); // bisiesto válido
      expect(parseYmd('2026-12-31')).toBe('2026-12-31');
    });

    it('rejects nonexistent calendar dates and invalid formats', () => {
      expect(parseYmd('2026-02-30')).toBeNull(); // fecha inexistente
      expect(parseYmd('2025-02-29')).toBeNull(); // año no bisiesto
      expect(parseYmd('2026-04-31')).toBeNull(); // abril tiene 30 días
      expect(parseYmd('2026-13-01')).toBeNull(); // mes 13 inválido
      expect(parseYmd('2026-00-15')).toBeNull(); // mes 0 inválido
      expect(parseYmd('2026/11/13')).toBeNull(); // barras en lugar de guiones
      expect(parseYmd('13-11-2026')).toBeNull(); // formato inverso
      expect(parseYmd('')).toBeNull();
      expect(parseYmd(null)).toBeNull();
      expect(parseYmd(undefined)).toBeNull();
      expect(parseYmd('not-a-date')).toBeNull();
    });
  });
});
