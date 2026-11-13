import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorResponse } from '@/lib/api/responses';
import { getTodayYmd, localYmdToUtcIso } from '@/lib/timezone';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  // Timezone from app_settings
  const { data: settings } = await db
    .from('app_settings')
    .select('timezone')
    .eq('id', 1)
    .maybeSingle();
  const timezone = settings?.timezone || 'America/Argentina/Buenos_Aires';

  const todayYmd = getTodayYmd(timezone);
  const todayStartUtc = localYmdToUtcIso(todayYmd, 'start', timezone);
  const todayEndUtc = localYmdToUtcIso(todayYmd, 'end', timezone);

  // Active status counts: draft, pending, in_progress, assembled
  const { data: activeOrders, error: activeErr } = await db
    .from('orders')
    .select('status')
    .in('status', ['draft', 'pending', 'in_progress', 'assembled']);

  if (activeErr) return rpcErrorResponse(activeErr);

  let draft = 0;
  let pending = 0;
  let in_progress = 0;
  let assembled = 0;
  for (const o of activeOrders ?? []) {
    if (o.status === 'draft') draft++;
    else if (o.status === 'pending') pending++;
    else if (o.status === 'in_progress') in_progress++;
    else if (o.status === 'assembled') assembled++;
  }

  // Dispatched today
  const { count: dispatchedCount, error: dispErr } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'dispatched')
    .gte('dispatched_at', todayStartUtc)
    .lte('dispatched_at', todayEndUtc);

  if (dispErr) return rpcErrorResponse(dispErr);

  // Cancelled today
  const { count: cancelledCount, error: cancErr } = await db
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('cancelled_at', todayStartUtc)
    .lte('cancelled_at', todayEndUtc);

  if (cancErr) return rpcErrorResponse(cancErr);

  // Top 10 urgent active orders
  const { data: urgentData, error: urgentErr } = await db
    .from('orders')
    .select(
      'id, order_number, status, priority, due_date, created_at, total_package, total_unit, customer:customers(name), lines:order_lines(package_scanned, unit_scanned)'
    )
    .in('status', ['draft', 'pending', 'in_progress', 'assembled'])
    .eq('priority', 'urgent')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (urgentErr) return rpcErrorResponse(urgentErr);

  const urgent = (urgentData ?? []).map((o: any) => {
    const lines = Array.isArray(o.lines) ? o.lines : [];
    const scanned = lines.reduce(
      (acc: number, l: any) => acc + (l.package_scanned ?? 0) + (l.unit_scanned ?? 0),
      0
    );
    const total = (o.total_package ?? 0) + (o.total_unit ?? 0);
    const customerName = (o.customer as any)?.name ?? 'Sin cliente';
    const { lines: _ignored, ...rest } = o;

    return {
      ...rest,
      customer_name: customerName,
      progress: { scanned, total },
    };
  });

  return NextResponse.json({
    counts: {
      draft,
      pending,
      in_progress,
      assembled,
      dispatched: dispatchedCount ?? 0,
      cancelled: cancelledCount ?? 0,
    },
    urgent,
    today: todayYmd,
  });
}
