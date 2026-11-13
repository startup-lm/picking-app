import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { parseYmd } from '@/lib/validation';
import type { ReportDay } from '@/types/rpc';

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

  return NextResponse.json({ groups: (data ?? []) as ReportDay[] });
}
