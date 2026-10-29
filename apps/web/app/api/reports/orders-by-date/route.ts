// app/api/reports/orders-by-date/route.ts
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to   = searchParams.get('to')   || '';
  const tz   = 'America/Argentina/Buenos_Aires';

  if (!from || !to) {
    return new Response('Parámetros "from" y "to" requeridos (YYYY-MM-DD).', { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('api_report_orders_by_date', {
    p_from: from, p_to: to, p_tz: tz
  });
  if (error) return new Response(error.message, { status: 500 });

  // data: [{ day: 'YYYY-MM-DD', orders: [...] }, ...]
  return Response.json({ groups: data ?? [] });
}
