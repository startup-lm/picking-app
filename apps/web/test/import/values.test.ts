import { describe, it, expect } from 'vitest';
import { cellText, normalizeDate, normalizePriority } from '@/lib/import/values';

describe('cellText', () => {
  it('formats number 7791234567041 as string', () => {
    expect(cellText(7791234567041)).toBe('7791234567041');
  });

  it('formats Date to local YYYY-MM-DD', () => {
    const d = new Date(2026, 11, 1); // 2026-12-01
    expect(cellText(d)).toBe('2026-12-01');
  });

  it('handles null and undefined as empty string', () => {
    expect(cellText(null)).toBe('');
    expect(cellText(undefined)).toBe('');
  });

  it('trims string inputs', () => {
    expect(cellText('  hola mundo  ')).toBe('hola mundo');
  });
});

describe('normalizeDate', () => {
  it('normalizes D/M/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('1/12/2026')).toBe('2026-12-01');
  });

  it('leaves YYYY-MM-DD unchanged', () => {
    expect(normalizeDate('2026-12-01')).toBe('2026-12-01');
  });

  it('calculates excel serial date 46000 with base 1899-12-30 UTC', () => {
    const baseMs = Date.UTC(1899, 11, 30);
    const dateMs = baseMs + 46000 * 86400000;
    const d = new Date(dateMs);
    const expected = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    expect(normalizeDate(46000)).toBe(expected);
    expect(normalizeDate('46000')).toBe(expected);
  });

  it('returns original text for invalid dates', () => {
    expect(normalizeDate('mañana')).toBe('mañana');
  });

  it('returns empty string for empty inputs', () => {
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate(null)).toBe('');
    expect(normalizeDate(undefined)).toBe('');
  });
});

describe('normalizePriority', () => {
  it('maps Urgente, SÍ, x to urgent', () => {
    expect(normalizePriority('Urgente')).toBe('urgent');
    expect(normalizePriority('SÍ')).toBe('urgent');
    expect(normalizePriority('x')).toBe('urgent');
    expect(normalizePriority('alta')).toBe('urgent');
  });

  it('maps empty, normal, No, 0 to empty string', () => {
    expect(normalizePriority('')).toBe('');
    expect(normalizePriority('normal')).toBe('');
    expect(normalizePriority('No')).toBe('');
    expect(normalizePriority('0')).toBe('');
    expect(normalizePriority(null)).toBe('');
  });

  it('returns raw string for other values', () => {
    expect(normalizePriority('media')).toBe('media');
    expect(normalizePriority('baja')).toBe('baja');
  });
});
