import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return jsonError(400, 'invalid_argument', 'ID de pedido inválido');
  }

  const { data: order, error } = await db
    .from('orders')
    .select(
      '*, customer:customers(*), lines:order_lines(*, product:products(id, sku, description, units_per_package, location))'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return rpcErrorResponse(error);
  if (!order) return jsonError(404, 'not_found', 'Pedido no encontrado');

  const rawLines = Array.isArray(order.lines) ? [...order.lines] : [];
  const lines = rawLines.sort((a: any, b: any) => {
    const locA = a.location?.trim() || '';
    const locB = b.location?.trim() || '';
    if (!locA && locB) return 1;
    if (locA && !locB) return -1;
    if (locA !== locB) {
      return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
    }
    const skuA = a.product?.sku?.trim() || '';
    const skuB = b.product?.sku?.trim() || '';
    return skuA.localeCompare(skuB);
  });

  const userIds = Array.from(
    new Set(
      [
        order.started_by,
        order.assembled_by,
        order.dispatched_by,
        order.cancelled_by,
        order.created_by,
      ].filter((uid): uid is string => Boolean(uid))
    )
  );

  let profilesMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    for (const p of profiles ?? []) {
      profilesMap.set(p.id, p.full_name || p.email || p.id);
    }
  }

  return NextResponse.json({
    ...order,
    lines,
    started_by_name: order.started_by ? profilesMap.get(order.started_by) ?? null : null,
    assembled_by_name: order.assembled_by ? profilesMap.get(order.assembled_by) ?? null : null,
    dispatched_by_name: order.dispatched_by ? profilesMap.get(order.dispatched_by) ?? null : null,
    cancelled_by_name: order.cancelled_by ? profilesMap.get(order.cancelled_by) ?? null : null,
    created_by_name: order.created_by ? profilesMap.get(order.created_by) ?? null : null,
  });
}
