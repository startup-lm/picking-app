import { ArmadoItem, ArmadoParse } from '@/types/csv';
import { parse } from 'csv-parse/sync';


function toInt(x: any): number {
  if (x === null || x === undefined) return 0;
  const n = Number(String(x).replace(',', '.').trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

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
  'unidades',
  'bultos',
  'uni sueltas',
  'pasillo',
  'ubicacion',
  'piso',
  '2da ubicacion pasillo',
  '2 ubicacion',
  '2 piso',
  '3ra ubicacion pasillo',
  '3ra ubicacion',
  '3 piso',
].map(norm);

export function parseArmadoCsv(buffer: Buffer): ArmadoParse {
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

  // valores por defecto (por si el archivo viene vacío)
  if (rows.length === 0) {
    return {
      client: '',
      items: [],
      total_package: 0,
      total_unit: 0,
      duplicates: [],
      headers_ok: false,
    };
  }

  // A1: cliente
  const client = String(rows[0]?.[0] ?? '').trim();

  // Fila 2: encabezados
  const headerRow: any[] = rows[1] ?? [];
  const normalized = headerRow.slice(0, 13).map(norm);
  const headers_ok =
    normalized.length >= EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((h, i) => h === normalized[i]);

  // Ítems desde la fila 3 (índice 2)
  const startIdx = 2;
  const items: ArmadoItem[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];

    const sku = String(r[0] ?? '').trim();
    const unidades = toInt(r[1]);
    const bultos = toInt(r[2]);
    const uniSueltas = toInt(r[3]);

    // Solo filas con SKU y cantidades > 0
    if (!sku) continue;
    if (bultos <= 0 && uniSueltas <= 0) continue;

    items.push({
      sku,
      unidades,
      bultos,
      uniSueltas,
      p1: r[4]?.toString().trim() || '',
      u1: r[5]?.toString().trim() || '',
      piso1: r[6]?.toString().trim() || '',
      p2: r[7]?.toString().trim() || '',
      u2: r[8]?.toString().trim() || '',
      piso2: r[9]?.toString().trim() || '',
      p3: r[10]?.toString().trim() || '',
      u3: r[11]?.toString().trim() || '',
      piso3: r[12]?.toString().trim() || '',
    });
  }

  // Duplicados por SKU (post-filtro)
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const it of items) {
    const key = it.sku;
    if (seen.has(key)) dups.add(key);
    seen.add(key);
  }

  const total_package = items.reduce((acc, it) => acc + toInt(it.bultos), 0);
  const total_unit = items.reduce((acc, it) => acc + toInt(it.uniSueltas), 0);

  return {
    client,
    items,
    total_package,
    total_unit,
    duplicates: Array.from(dups),
    headers_ok,
  };
}

// --- zero-pad si es numérico (Ubicación/Piso) ---
function pad2IfNumeric(v?: string) {
  const s = (v ?? '').trim();
  if (!s) return '';
  return /^\d+$/.test(s) ? s.padStart(2, '0') : s;
}

export function buildLocation(it: ArmadoItem): string {
  // formatea: Pasillo + Ubicación(02) + Piso(01)
  const seg = (pasillo?: string, ubicacion?: string, piso?: string) =>
    [pasillo?.trim(), pad2IfNumeric(ubicacion), pad2IfNumeric(piso)]
      .filter(Boolean)
      .join(' ')
      .trim();

  const s1 = seg(it.p1, it.u1, it.piso1);
  const s2 = seg(it.p2, it.u2, it.piso2);
  const s3 = seg(it.p3, it.u3, it.piso3);

  return [s1, s2 ? `- ${s2}` : '', s3 ? `- ${s3}` : ''].filter(Boolean).join(' ');
}
