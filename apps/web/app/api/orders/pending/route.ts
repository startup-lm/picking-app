import { NextRequest, NextResponse } from 'next/server';
import { getUserClient, jsonError, rpcErrorResponse } from '@/lib/supabase/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const db = getUserClient(req);
  if (!db) return jsonError(401, 'unauthorized', 'Sesión requerida');

  const { data, error } = await db
    .from('orders')
    .select('id, order_number, status, created_at, customer:customers(name)')
    .in('status', ['draft', 'pending', 'in_progress', 'assembled'])
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return rpcErrorResponse(error);
  }

  const orders = (data ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    created_at: o.created_at,
    customer: o.customer?.name ?? 'Sin cliente',
  }));

  return NextResponse.json({ orders });
}
