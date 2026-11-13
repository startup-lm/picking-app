import { NextRequest, NextResponse } from 'next/server';
import { getUserClient, jsonError } from '@/lib/supabase/route';
import { errorMessage } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const db = getUserClient(req);
  if (!db) return jsonError(401, 'unauthorized', 'Sesión requerida');

  const body = await req.json().catch(() => ({}));
  const ids = body?.ids;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  const isValidIds =
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= 100 &&
    ids.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0);

  if (!isValidIds || !reason || reason.length > 500) {
    return jsonError(400, 'invalid_argument', 'Datos inválidos para cancelar pedidos');
  }

  const cancelled_ids: number[] = [];
  const errors: { id: number; code: string; message: string }[] = [];

  for (const id of ids) {
    const { error } = await db.rpc('api_set_order_status', {
      p_order_id: id,
      p_status: 'cancelled',
      p_reason: reason,
    });

    if (error) {
      const code = error.message?.trim() || 'internal';
      errors.push({ id, code, message: errorMessage(error) });
    } else {
      cancelled_ids.push(id);
    }
  }

  return NextResponse.json({ cancelled_ids, errors });
}
