function formatDateLocal(d: Date): string {
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function cellText(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  if (v instanceof Date) {
    return formatDateLocal(v);
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) {
      return String(v);
    }
    if (Number.isInteger(v)) {
      if (Number.isSafeInteger(v)) {
        return BigInt(v).toString();
      }
      return v.toLocaleString('fullwide', { useGrouping: false });
    }
    return String(v).trim();
  }
  if (typeof v === 'bigint') {
    return v.toString();
  }
  return String(v).trim();
}

function dateFromExcelSerial(serial: number): string {
  const baseMs = Date.UTC(1899, 11, 30);
  const dateMs = baseMs + Math.round(serial) * 86400000;
  const d = new Date(dateMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeDate(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return String(v);
    return formatDateLocal(v);
  }
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 20000 && v <= 80000) {
      return dateFromExcelSerial(v);
    }
    return cellText(v);
  }

  const raw = String(v).trim();
  if (!raw) {
    return '';
  }

  if (/^\d{5}$/.test(raw)) {
    const num = parseInt(raw, 10);
    if (num >= 20000 && num <= 80000) {
      return dateFromExcelSerial(num);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mth = dmyMatch[2].padStart(2, '0');
    const yr = dmyMatch[3];
    return `${yr}-${mth}-${day}`;
  }

  const ymdMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const yr = ymdMatch[1];
    const mth = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${yr}-${mth}-${day}`;
  }

  return raw;
}

export function normalizePriority(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  const raw = String(v).trim();
  if (!raw) {
    return '';
  }
  const norm = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (norm === 'normal' || norm === 'no' || norm === '0') {
    return '';
  }
  if (
    norm === 'urgente' ||
    norm === 'urgent' ||
    norm === 'si' ||
    norm === '1' ||
    norm === 'alta' ||
    norm === 'x'
  ) {
    return 'urgent';
  }
  return raw;
}
