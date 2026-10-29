import { ProductCsvItem, ProductCsvParse } from '@/types/csv';
import { parse } from 'csv-parse/sync';

// normaliza para comparar encabezados: sin acentos, minúsculas, 1 espacio
function norm(s: string) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPECTED_HEADERS = [
  'articulo',
  'descripcion',
  'codigo bulto',
  'codigo unidad',
].map(norm);

export function parseProductsCsv(buffer: Buffer): ProductCsvParse {
  const sampleUtf8 = buffer.toString('utf8', 0, 1500);
  const firstLine = sampleUtf8.split(/\r?\n/)[0] ?? '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const likelyDelimiter =
    semicolonCount > commaCount && semicolonCount > tabCount
      ? ';'
      : tabCount > commaCount
        ? '\\t'
        : ',';
  const hasReplacementChar = sampleUtf8.includes('\uFFFD');
  const parseInput = hasReplacementChar ? buffer.toString('latin1') : buffer;

  const rows: any[][] = parse(parseInput, {
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
    delimiter: likelyDelimiter === '\\t' ? '\t' : likelyDelimiter,
  });

  if (rows.length === 0) {
    return {
      items: [],
      headers_ok: false,
      duplicates: [],
      total_rows: 0,
    };
  }

  const headerRow: any[] = rows[0] ?? [];
  const normalized = headerRow.slice(0, 4).map(norm);
  const headers_ok =
    normalized.length >= EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((h, i) => h === normalized[i]);

  const items: ProductCsvItem[] = [];
  const seen = new Set<string>();
  const dups = new Set<string>();
  let total_rows = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sku = String(r[0] ?? '').trim();
    const description = String(r[1] ?? '').trim();
    const packageCode = String(r[2] ?? '').trim();
    const unitCode = String(r[3] ?? '').trim();

    if (!sku) continue;
    total_rows += 1;

    if (seen.has(sku)) dups.add(sku);
    seen.add(sku);

    items.push({
      sku,
      description,
      packageCode,
      unitCode,
    });
  }

  const uniqMap = new Map<string, ProductCsvItem>();
  for (const it of items) {
    uniqMap.set(it.sku, it);
  }

  return {
    items: Array.from(uniqMap.values()),
    headers_ok,
    duplicates: Array.from(dups),
    total_rows,
  };
}
