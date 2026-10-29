import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type DBOrder = {
  id: number;
  client: string | null;
  total_package: number | null;
  total_unit: number | null;
};

type POLine = {
  product_id: number;
  location: string | null;
  package_total: number | null;
  unit_total: number | null;
};

type Product = { id: number; sku: string; description: string | null };

function escapeHtml(s: string | undefined | null) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function slugify(input: string, max = 50) {
  return (input ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\-_. ]+/g, ' ')
    .trim().replace(/\s+/g, '_')
    .slice(0, max) || 'cliente';
}

function buildOrderHTML(order: DBOrder, items: Array<{
  product: Product,
  bultos: number,
  sueltas: number,
  location: string
}>, padRowsTo = 15) {
  const filled =
    padRowsTo > items.length
      ? [...items, ...Array.from({ length: padRowsTo - items.length }).map(() => ({
        product: { id: 0, sku: '', description: '' } as Product,
        bultos: 0,
        sueltas: 0,
        location: '',
      }))] : items;

  const rows = filled.map(it => {
    const sku = String(it?.product?.sku ?? '').trim();
    const b = sku ? (it?.bultos ?? 0) : '';   // si hay SKU: muestra bultos o 0; si no hay SKU: ''
    const s = sku ? (it?.sueltas ?? 0) : '';  // idem para sueltas

    return `
    <tr>
      <td class="code">${escapeHtml(sku)}</td>
      <td class="desc">${escapeHtml(it?.product?.description ?? '')}</td>
      <td class="loc">${escapeHtml(it?.location ?? '')}</td>
      <td class="num">${b}</td>
      <td class="num">${s}</td>
    </tr>
  `;
  }).join('');


  // >>> MISMO CSS/estructura que tu Expo <<<
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>pedido_${escapeHtml(String(order.id))}_${escapeHtml(slugify(String(order.client ?? '')))}.pdf</title>
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
  @media print {
    @page { margin: 5mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="title">${escapeHtml(String(order.client ?? ''))} - # ${escapeHtml(String(order.id))}</div>

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
      <div class="tot">TOTAL BULTOS: ${escapeHtml(String(order.total_package ?? 0))}</div>
      <div class="tot">TOTAL UNIDADES: ${escapeHtml(String(order.total_unit ?? 0))}</div>
    </div>
  </div>

  <script>
    // Imprime automáticamente al cargar
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 50);
    });
  </script>
</body>
</html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return new Response('ID inválido', { status: 400 });

  // 1) Orden
  const { data: order, error: e1 } = await supabaseAdmin
    .from('orders')
    .select('id, client, total_package, total_unit')
    .eq('id', id)
    .maybeSingle<DBOrder>();
  if (e1) return new Response(e1.message, { status: 500 });
  if (!order) return new Response('Pedido no encontrado', { status: 404 });

  // 2) Líneas
  const { data: lines, error: e2 } = await supabaseAdmin
    .from('product_order')
    .select('product_id, location, package_total, unit_total')
    .eq('order_id', id)
    .order('id', { ascending: true }) as unknown as { data: POLine[]; error: any };
  if (e2) return new Response(e2.message, { status: 500 });

  // 3) Productos
  const ids = Array.from(new Set((lines ?? []).map(l => l.product_id))).filter(Boolean);
  let products: Product[] = [];
  if (ids.length) {
    const { data: prods, error: e3 } = await supabaseAdmin
      .from('products')
      .select('id, sku, description')
      .in('id', ids);
    if (e3) return new Response(e3.message, { status: 500 });
    products = prods ?? [];
  }
  const pmap = new Map(products.map(p => [p.id, p]));

  const items = (lines ?? []).map(li => ({
    product: pmap.get(li.product_id) ?? { id: li.product_id, sku: '', description: '' },
    bultos: li.package_total ?? 0,
    sueltas: li.unit_total ?? 0,
    location: String(li.location ?? ''),
  }));

  const html = buildOrderHTML(order, items, 15);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
