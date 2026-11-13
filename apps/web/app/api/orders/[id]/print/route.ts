import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';

export const runtime = 'nodejs';

function escapeHtml(s: string | undefined | null) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function slugify(input: string, max = 50) {
  return (
    (input ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-_. ]+/g, ' ')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, max) || 'cliente'
  );
}

function buildOrderHTML(
  orderNumber: string,
  customer: string,
  totalPackage: number,
  totalUnit: number,
  items: Array<{
    product: { sku: string; description: string | null };
    bultos: number;
    sueltas: number;
    location: string;
  }>,
  dueDate?: string | null,
  notes?: string | null,
  padRowsTo = 15
) {
  const filled =
    padRowsTo > items.length
      ? [
          ...items,
          ...Array.from({ length: padRowsTo - items.length }).map(() => ({
            product: { sku: '', description: '' },
            bultos: 0,
            sueltas: 0,
            location: '',
          })),
        ]
      : items;

  const rows = filled
    .map(it => {
      const sku = String(it?.product?.sku ?? '').trim();
      const b = sku ? (it?.bultos ?? 0) : '';
      const s = sku ? (it?.sueltas ?? 0) : '';

      return `
    <tr>
      <td class="code">${escapeHtml(sku)}</td>
      <td class="desc">${escapeHtml(it?.product?.description ?? '')}</td>
      <td class="loc">${escapeHtml(it?.location ?? '')}</td>
      <td class="num">${b}</td>
      <td class="num">${s}</td>
    </tr>
  `;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>pedido_${escapeHtml(orderNumber)}_${escapeHtml(slugify(customer))}.pdf</title>
<style>
  @page { size: A4; margin: 5mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Arial, Helvetica, sans-serif; }
  .sheet { border: 1px solid #000; padding: 4mm; display: flex; flex-direction: column; gap: 3mm; }
  .title { text-align: center; font-weight: 700; font-size: 14px; padding: 3px 4px; border: 1px solid #000; letter-spacing: .5px; }
  .meta { font-size: 11px; padding: 2px 4px; border: 1px solid #000; display: flex; gap: 16px; }
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
  @media print {
    @page { margin: 5mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="title">${escapeHtml(customer)} - ${escapeHtml(orderNumber)}</div>
    ${dueDate || notes ? `
    <div class="meta">
      ${dueDate ? `<span><strong>Entrega:</strong> ${escapeHtml(dueDate)}</span>` : ''}
      ${notes ? `<span><strong>Notas:</strong> ${escapeHtml(notes)}</span>` : ''}
    </div>` : ''}

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
      <div class="tot">TOTAL BULTOS: ${escapeHtml(String(totalPackage))}</div>
      <div class="tot">TOTAL UNIDADES: ${escapeHtml(String(totalUnit))}</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 50);
    });
  </script>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, 'invalid_argument', 'ID inválido');

  const { data: order, error } = await db
    .from('orders')
    .select(
      'id, order_number, total_package, total_unit, due_date, notes, customer:customers(name), lines:order_lines(location, package_total, unit_total, product:products(sku, description))'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return rpcErrorResponse(error);
  if (!order) return jsonError(404, 'not_found', 'Pedido no encontrado');

  const customerName = (order.customer as any)?.name ?? 'Sin cliente';
  const rawLines = (order.lines as any[]) ?? [];

  const sortedLines = [...rawLines].sort((a, b) => {
    const locA = a.location?.trim() || '';
    const locB = b.location?.trim() || '';
    if (!locA && locB) return 1;
    if (locA && !locB) return -1;
    if (locA !== locB) return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
    const skuA = a.product?.sku?.trim() || '';
    const skuB = b.product?.sku?.trim() || '';
    return skuA.localeCompare(skuB);
  });

  const items = sortedLines.map(li => ({
    product: {
      sku: li.product?.sku ?? '',
      description: li.product?.description ?? '',
    },
    bultos: li.package_total ?? 0,
    sueltas: li.unit_total ?? 0,
    location: String(li.location ?? ''),
  }));

  const html = buildOrderHTML(
    order.order_number,
    customerName,
    order.total_package ?? 0,
    order.total_unit ?? 0,
    items,
    order.due_date,
    order.notes,
    15
  );

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
