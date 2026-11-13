import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError } from '@/lib/api/responses';
import { errorMessage } from '@/lib/errors';
import { isPositiveIntArray, nonEmptyString } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const body = await req.json().catch(() => ({}));
  const ids = body?.ids;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!isPositiveIntArray(ids, 100) || !nonEmptyString(reason, 500)) {
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
