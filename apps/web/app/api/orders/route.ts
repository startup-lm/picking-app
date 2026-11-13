import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { errorMessage } from '@/lib/errors';
import { parseYmd } from '@/lib/validation';
import { escapePostgrestFilter } from '@/lib/supabase/postgrest';
import { localYmdToUtcIso } from '@/lib/timezone';
import type { OrderStatus, SaveOrderResult } from '@/types/rpc';

export const runtime = 'nodejs';

const VALID_STATUSES: OrderStatus[] = [
  'draft',
  'pending',
  'in_progress',
  'assembled',
  'dispatched',
  'cancelled',
];

const DEFAULT_STATUSES: OrderStatus[] = [
  'draft',
  'pending',
  'in_progress',
  'assembled',
  'dispatched',
];

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const searchParams = req.nextUrl.searchParams;

  // Status filter
  const statusParam = searchParams.get('status');
  let selectedStatuses: OrderStatus[] = DEFAULT_STATUSES;
  if (statusParam) {
    const rawStatuses = statusParam.split(',').map((s) => s.trim()) as OrderStatus[];
    const valid = rawStatuses.filter((s) => VALID_STATUSES.includes(s));
    if (valid.length > 0) {
      selectedStatuses = valid;
    }
  }

  // Search query q
  const rawQ = (searchParams.get('q') || '').trim();
  const q = rawQ.slice(0, 100);

  // Timezone and date range
  const { data: settings } = await db
    .from('app_settings')
    .select('timezone')
    .eq('id', 1)
    .maybeSingle();
  const timezone = settings?.timezone || 'America/Argentina/Buenos_Aires';

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const fromYmd = parseYmd(fromParam);
  const toYmd = parseYmd(toParam);

  // Page
  const pageParam = searchParams.get('page');
  const page = Math.max(0, parseInt(pageParam || '0', 10) || 0);

  // Build query
  let query = db
    .from('orders')
    .select(
      'id, order_number, status, priority, due_date, created_at, total_package, total_unit, customer:customers(name), lines:order_lines(package_scanned, unit_scanned, package_checked, unit_checked)'
    )
    .in('status', selectedStatuses);

  // If search filter provided
  if (q) {
    const escapedQ = escapePostgrestFilter(q);
    // 1. Search for matching customers
    const { data: matchedCustomers } = await db
      .from('customers')
      .select('id')
      .ilike('name', `%${escapedQ}%`);
    const customerIds = (matchedCustomers ?? []).map((c) => c.id);

    if (customerIds.length > 0) {
      query = query.or(`order_number.ilike.%${escapedQ}%,customer_id.in.(${customerIds.join(',')})`);
    } else {
      query = query.ilike('order_number', `%${escapedQ}%`);
    }
  }

  // Date filters
  if (fromYmd) {
    const fromUtc = localYmdToUtcIso(fromYmd, 'start', timezone);
    query = query.gte('created_at', fromUtc);
  }
  if (toYmd) {
    const toUtc = localYmdToUtcIso(toYmd, 'end', timezone);
    query = query.lte('created_at', toUtc);
  }

  // Order and pagination
  query = query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const { data, error } = await query;
  if (error) return rpcErrorResponse(error);

  const rawOrders = (data ?? []) as any[];
  const hasMore = rawOrders.length > PAGE_SIZE;
  const pageOrders = hasMore ? rawOrders.slice(0, PAGE_SIZE) : rawOrders;

  const orders = pageOrders.map((order) => {
    const lines = Array.isArray(order.lines) ? order.lines : [];
    const scanned = lines.reduce(
      (acc: number, l: any) => acc + (l.package_scanned ?? 0) + (l.unit_scanned ?? 0),
      0
    );
    const checked = lines.reduce(
      (acc: number, l: any) => acc + (l.package_checked ?? 0) + (l.unit_checked ?? 0),
      0
    );
    const total = (order.total_package ?? 0) + (order.total_unit ?? 0);

    const { lines: _ignoredLines, ...rest } = order;
    return {
      ...rest,
      progress: {
        scanned,
        checked,
        total,
      },
    };
  });

  return NextResponse.json({ orders, hasMore });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid_argument', 'Datos inválidos para crear o guardar pedido');
  }

  const lines = (body as any).lines;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 500) {
    return jsonError(400, 'invalid_order', 'El pedido debe tener entre 1 y 500 líneas');
  }

  for (const line of lines) {
    if (!line || typeof line !== 'object') {
      return jsonError(400, 'invalid_argument', 'Línea de pedido inválida');
    }
    const pid = line.product_id;
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
      return jsonError(400, 'invalid_argument', 'ID de producto inválido en línea');
    }
    if (line.package_total !== undefined && line.package_total !== null) {
      if (typeof line.package_total !== 'number' || !Number.isInteger(line.package_total) || line.package_total < 0) {
        return jsonError(400, 'invalid_argument', 'Cantidad de bultos inválida');
      }
    }
    if (line.unit_total !== undefined && line.unit_total !== null) {
      if (typeof line.unit_total !== 'number' || !Number.isInteger(line.unit_total) || line.unit_total < 0) {
        return jsonError(400, 'invalid_argument', 'Cantidad de unidades inválida');
      }
    }
  }

  const { data, error } = await db.rpc('api_save_order', { p_order: body });

  if (error) {
    if (error.message === 'not_found') {
      return jsonError(404, 'not_found', 'Pedido no encontrado');
    }
    if (error.message === 'order_locked') {
      return jsonError(409, 'order_locked', 'El pedido ya no se puede editar');
    }
    if (error.message === 'invalid_order') {
      const detail = (error as any).details || (error as any).detail || undefined;
      return NextResponse.json(
        { code: 'invalid_order', message: errorMessage(error), detail },
        { status: 400 }
      );
    }
    return rpcErrorResponse(error);
  }

  return NextResponse.json(data as SaveOrderResult);
}
