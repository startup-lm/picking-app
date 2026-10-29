import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatDate, formatDateTime } from '@/utils/date';

function csvEsc(s: any) {
  const t = s == null ? '' : String(s);
  const esc = t.replace(/"/g, '""');
  return /[",\n]/.test(esc) ? `"${esc}"` : esc;
}

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to   = searchParams.get('to')   || '';
  const tz   = 'America/Argentina/Buenos_Aires';

  if (!from || !to) {
    return new Response('Parámetros "from" y "to" requeridos (YYYY-MM-DD).', { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('api_report_orders_by_date', {
    p_from: from, p_to: to, p_tz: tz
  });
  if (error) return new Response(error.message, { status: 500 });

  const rows: string[] = [];
  rows.push([
    'Fecha',
    'Nro Pedido',
    'Cliente',
    'Fecha armado',
    'Cod Producto',
    'Descripcion',
    'Bultos',
    'Unidades sueltas',
    'Bultos escaneados',
    'Uni sueltas escaneadas',
  ].join(','));

  for (const g of (data ?? [])) {
    const orders = Array.isArray(g.orders) ? g.orders : [];

    for (const o of orders) {
      const fecha = formatDate(o.created_at); 
      const fechaArmado = o.updated_at ? formatDateTime(o.updated_at) : '';

      const base = [
        csvEsc(fecha),
        csvEsc(o.id),
        csvEsc(o.client),
        csvEsc(fechaArmado),
      ].join(',');

      const lines = Array.isArray(o.lines) ? o.lines : [];
      if (lines.length === 0) {
        rows.push(base + ',,,,,,');
      } else {
        for (const li of lines) {
          rows.push([
            base,
            csvEsc(li.sku),
            csvEsc(li.description),
            csvEsc(li.package_total),
            csvEsc(li.unit_total),
            csvEsc(li.package_scanned),
            csvEsc(li.unit_scanned),
          ].join(','));
        }
      }
    }
  }

  const csv = rows.join('\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reporte_pedidos_${from}_a_${to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}