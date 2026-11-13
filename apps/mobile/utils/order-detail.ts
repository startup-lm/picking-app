import type { OrderDetailLine } from '@/lib/repository/orders';
import type { Stage } from '@/types/rpc';
import { isLineComplete, progressOf } from './progress';

// Extrae todas las letras de pasillo desde una location que puede tener múltiples segmentos
// Ej: "A 02 01 - D 01 01" -> ["A","D"]
function extractAisleLetters(location?: string | null): string[] {
  const loc = (location ?? '').trim();
  if (!loc) return ['#'];

  // Soporta guión normal y en-dash
  const parts = loc.split(/[-–]/).map((s) => s.trim()).filter(Boolean);
  const letters = new Set<string>();

  for (const seg of parts.length ? parts : [loc]) {
    const m = seg.toUpperCase().match(/[A-ZÁÉÍÓÚÑ]/); // primera letra válida
    if (m) letters.add(m[0]);
  }

  return letters.size ? Array.from(letters) : ['#'];
}

export function computeAisleStats(rows: OrderDetailLine[], stage: Stage) {
  const m = new Map<string, { total: number; pending: number }>();

  rows.forEach((r) => {
    const letters = extractAisleLetters(r.location);
    const isPending = !isLineComplete(r, stage);

    // Contamos este renglón en cada pasillo que menciona (A y D, por ejemplo)
    for (const letter of letters) {
      const cur = m.get(letter) ?? { total: 0, pending: 0 };
      cur.total += 1;
      if (isPending) cur.pending += 1;
      m.set(letter, cur);
    }
  });

  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([letter, stats]) => ({ letter, ...stats }));
}

export function filterAndSortRows(
  rows: OrderDetailLine[],
  selectedAisle: 'ALL' | string,
  sortKey: 'location' | 'sku',
  sortDir: 'asc' | 'desc'
) {
  const filtered = rows.filter((r) => {
    if (selectedAisle === 'ALL') return true;
    const letters = extractAisleLetters(r.location);
    return letters.includes(selectedAisle);
  });

  const dir = sortDir === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    if (sortKey === 'location') {
      const la = (a.location ?? '').toString();
      const lb = (b.location ?? '').toString();
      const c = la.localeCompare(lb, 'es', { sensitivity: 'base' });
      if (c !== 0) return c * dir;

      const sa = (a.product?.sku ?? '').toString();
      const sb = (b.product?.sku ?? '').toString();
      const c2 = sa.localeCompare(sb, 'es', { sensitivity: 'base' });
      if (c2 !== 0) return c2 * dir;

      return (a.id - b.id) * dir;
    } else {
      const sa = (a.product?.sku ?? '').toString();
      const sb = (b.product?.sku ?? '').toString();
      const c = sa.localeCompare(sb, 'es', { sensitivity: 'base' });
      if (c !== 0) return c * dir;

      const la = (a.location ?? '').toString();
      const lb = (b.location ?? '').toString();
      const c2 = la.localeCompare(lb, 'es', { sensitivity: 'base' });
      if (c2 !== 0) return c2 * dir;

      return (a.id - b.id) * dir;
    }
  });
}

export function getPendientes(rows: OrderDetailLine[], stage: Stage) {
  return rows.filter((r) => !isLineComplete(r, stage));
}

export function pendientesResumen(pend: OrderDetailLine[], stage: Stage) {
  const lines = pend.slice(0, 5).map((r) => {
    const p = progressOf(r, stage);
    const remP = Math.max(0, p.pkgTotal - p.pkgDone);
    const remU = Math.max(0, p.unitTotal - p.unitDone);
    const etiqueta = `${r.product.sku} • ${r.product.description}`;
    const partes: string[] = [];
    if (remP > 0) partes.push(`${remP} bulto/s`);
    if (remU > 0) partes.push(`${remU} unidad/es`);
    return `• ${etiqueta} (${partes.join(' y ')})`;
  });
  const extra = pend.length > 5 ? `\n…y ${pend.length - 5} más.` : '';
  return `${lines.join('\n')}${extra}`;
}
