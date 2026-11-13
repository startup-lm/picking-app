export function isEmail(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (s.length === 0 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function nonEmptyString(v: unknown, maxLen?: number): boolean {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (s.length === 0) return false;
  if (maxLen !== undefined && s.length > maxLen) return false;
  return true;
}

export function isHexColor(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

export function isTimezone(v: unknown): boolean {
  if (typeof v !== 'string' || !v.trim()) return false;
  try {
    return Intl.supportedValuesOf('timeZone').includes(v.trim());
  } catch {
    return false;
  }
}

export function isPositiveIntArray(v: unknown, maxLen?: number): boolean {
  if (!Array.isArray(v) || v.length === 0) return false;
  if (maxLen !== undefined && v.length > maxLen) return false;
  return v.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0);
}

export function parseYmd(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return null;
  }
  const parts = v.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return v;
}
