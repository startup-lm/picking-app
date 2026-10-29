// lib/print/printOrderSheet.ts
import * as Print from 'expo-print';
// Usamos la API legacy para evitar el warning y mantener move/copy/delete.
import * as FileSystem from 'expo-file-system/legacy';
import type { Order, Product } from '@/types/db';
import type { PrintItem, BuildOptions } from '@/types/print';

const escapeHtml = (s: string | undefined | null) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function slugify(input: string, max = 50) {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-_. ]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, max) || 'cliente';
}

// Obtiene el directorio de un file URI "file:///.../nombre.pdf"
function dirname(uri: string) {
  const i = uri.lastIndexOf('/');
  return i >= 0 ? uri.slice(0, i + 1) : uri;
}

// Si ya existe un archivo con ese nombre, genera uno único: nombre-1.pdf, nombre-2.pdf, ...
async function reserveTargetPath(baseDir: string, baseName: string) {
  const dot = baseName.lastIndexOf('.');
  const name = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';

  let candidate = `${name}${ext}`;
  let idx = 1;

  // @ts-ignore - legacy getInfoAsync existe en la API legacy
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const info = await FileSystem.getInfoAsync(baseDir + candidate);
    if (!info.exists) return baseDir + candidate;
    candidate = `${name}-${idx}${ext}`;
    idx += 1;
  }
}

export function buildOrderHTML(
  order: Order,
  items: PrintItem[],
  opts: BuildOptions = {}
) {
  const padRowsTo = typeof opts.padRowsTo === 'number' ? opts.padRowsTo : 15;

  const filledItems =
    padRowsTo > items.length
      ? [
          ...items,
          ...Array.from({ length: padRowsTo - items.length }).map(() => ({
            product: {
              id: 0,
              sku: '',
              description: '',
              package_barcode: 0,
              unit_barcode: 0,
              created_at: '',
            } as Product,
            bultos: 0,
            sueltas: 0,
          })),
        ]
      : items;

  const rows = filledItems
    .map((it) => {
      const { product, bultos, sueltas } = it as any;
      const location = (it as any).location ?? '';
      const sku = product.sku ?? '';
      return `
      <tr>
        <td class="code">${escapeHtml(sku)}</td>
        <td class="desc">${escapeHtml(product.description)}</td>
        <td class="loc">${escapeHtml(location)}</td>
        <td class="num">${bultos || ''}</td>
        <td class="num">${sueltas || ''}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Pedido ${escapeHtml(String(order.id))} - ${escapeHtml(String(order.client))}</title>
  <style>
    @page { size: A4; margin: 5mm; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Arial, Helvetica, sans-serif; }
    .sheet { border: 1px solid #000; padding: 4mm; display: flex; flex-direction: column; gap: 3mm; }
    .title { text-align: center; font-weight: 700; font-size: 14px; padding: 3px 4px; border: 1px solid #000; letter-spacing: .5px; }

    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    th, td { border: 1px solid #000; padding: 2px 4px; font-size: 11px; vertical-align: middle; word-wrap: break-word; }
    th { text-align: left; font-weight: 700; }
    .code { width: 18%; }
    .desc { width: 44%; }
    .loc  { width: 15%; }
    .num  { width: 11%; text-align: right; }

    tbody tr { height: 6mm; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; font-size: 12px; font-weight: 700; margin-top: 2mm; }
    .tot { border: 1px solid #000; padding: 2px 6px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="title">${escapeHtml(order.client)} - # ${escapeHtml(String(order.id))}</div>

    <table>
      <thead>
        <tr>
          <th class="code">COD PROD</th>
          <th class="desc">DESCRIPCION</th>
          <th class="loc">UBICACION</th>
          <th class="num">BULTOS</th>
          <th class="num">UNIDADES</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer">
      <div class="tot">TOTAL BULTOS: ${escapeHtml(String(order.total_package))}</div>
      <div class="tot">TOTAL UNIDADES: ${escapeHtml(String(order.total_unit))}</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateOrderPDF(
  order: Order,
  items: PrintItem[],
  opts: BuildOptions = {}
): Promise<{ uri: string; base64?: string }> {
  // 1) generar el PDF temporal
  const html = buildOrderHTML(order, items, opts);
  const { uri, base64 } = await Print.printToFileAsync({
    html,
    base64: !!opts.returnBase64,
  });

  // 2) armar nombre destino en el MISMO directorio del temporal
  const clientSlug = slugify(String(order.client ?? ''));
  const desiredName = `pedido_${String(order.id)}_${clientSlug}.pdf`.toLowerCase();
  const baseDir = dirname(uri);
  const targetUri = await reserveTargetPath(baseDir, desiredName);

  // 3) mover/renombrar (con fallback a copy+delete)
  try {
    if (uri !== targetUri) {
      try {
        await FileSystem.moveAsync({ from: uri, to: targetUri });
      } catch {
        await FileSystem.copyAsync({ from: uri, to: targetUri });
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
    return opts.returnBase64 ? { uri: targetUri, base64 } : { uri: targetUri };
  } catch {
    // si algo falla, devolvé el temporal
    return opts.returnBase64 ? { uri, base64 } : { uri };
  }
}
