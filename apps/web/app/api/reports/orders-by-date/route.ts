import { NextRequest, NextResponse } from 'next/server';
import { getUserClient, jsonError, rpcErrorResponse } from '@/lib/supabase/route';
import type { ReportDay } from '@/types/rpc';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const db = getUserClient(req);
  if (!db) return jsonError(401, 'unauthorized', 'Sesión requerida');

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!from || !to) {
    return jsonError(400, 'invalid_argument', 'Parámetros "from" y "to" requeridos (YYYY-MM-DD).');
  }

  const { data, error } = await db.rpc('api_report_orders', {
    p_from: from,
    p_to: to,
  });

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({ groups: (data ?? []) as ReportDay[] });
}
