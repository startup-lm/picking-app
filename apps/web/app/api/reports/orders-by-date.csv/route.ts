import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { parseYmd } from '@/lib/validation';
import { formatDate, formatDateTime } from '@/utils/date';
import { estadoLabel } from '@/utils/report';
import type { ReportDay } from '@/types/rpc';

function csvEsc(s: any) {
  const t = s == null ? '' : String(s);
  const esc = t.replace(/"/g, '""');
  return /[",\n\r]/.test(esc) ? `"${esc}"` : esc;
}

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const validFrom = parseYmd(from);
  const validTo = parseYmd(to);

  if (!validFrom || !validTo) {
    return jsonError(400, 'invalid_argument', 'Parámetros "from" y "to" requeridos (YYYY-MM-DD).');
  }

  const { data, error } = await db.rpc('api_report_orders', {
    p_from: validFrom,
    p_to: validTo,
  });

  if (error) {
    return rpcErrorResponse(error);
  }

  const groups = (data ?? []) as ReportDay[];

  const rows: string[] = [];
  rows.push(
    [
      'Fecha',
      'Nro Pedido',
      'Cliente',
      'Estado',
      'Armado',
      'Armado por',
      'Cod Producto',
      'Descripcion',
      'Ubicacion',
      'Bultos',
      'Unidades sueltas',
      'Bultos escaneados',
      'Uni sueltas escaneadas',
    ].join(',')
  );

  for (const g of groups) {
    const orders = Array.isArray(g.orders) ? g.orders : [];

    for (const o of orders) {
      const fecha = formatDate(g.day);
      const nroPedido = o.order_number;
      const cliente = o.customer;
      const estado = estadoLabel(o.status);
      const armado = o.assembled_at ? formatDateTime(o.assembled_at) : '';
      const armadoPor = o.assembled_by_name ?? '';

      const base = [
        csvEsc(fecha),
        csvEsc(nroPedido),
        csvEsc(cliente),
        csvEsc(estado),
        csvEsc(armado),
        csvEsc(armadoPor),
      ];

      const lines = Array.isArray(o.lines) ? o.lines : [];
      if (lines.length === 0) {
        rows.push([...base, '', '', '', '', '', '', ''].join(','));
      } else {
        for (const li of lines) {
          rows.push(
            [
              ...base,
              csvEsc(li.sku),
              csvEsc(li.description ?? ''),
              csvEsc(li.location ?? ''),
              csvEsc(li.package_total),
              csvEsc(li.unit_total),
              csvEsc(li.package_scanned),
              csvEsc(li.unit_scanned),
            ].join(',')
          );
        }
      }
    }
  }

  const csv = rows.join('\n');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
