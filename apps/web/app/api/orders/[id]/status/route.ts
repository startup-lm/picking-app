import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';

export const runtime = 'nodejs';

export async function POST(
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

  const body = await req.json().catch(() => null);
  const status = body?.status;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!status || !['pending', 'draft', 'cancelled'].includes(status)) {
    return jsonError(400, 'invalid_argument', 'Estado inválido');
  }

  if (status === 'cancelled' && !reason) {
    return jsonError(400, 'reason_required', 'Falta el motivo de cancelación');
  }

  const { data, error } = await db.rpc('api_set_order_status', {
    p_order_id: id,
    p_status: status,
    p_reason: reason || null,
  });

  if (error) return rpcErrorResponse(error);

  return NextResponse.json(data);
}
