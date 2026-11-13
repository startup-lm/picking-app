import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorResponse } from '@/lib/api/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const { data, error } = await db
    .from('orders')
    .select('id, order_number, status, created_at, customer:customers(name)')
    .neq('status', 'cancelled')
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
