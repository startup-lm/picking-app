import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, client, created_at, dispatches!inner(status)')
    .eq('dispatches.status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ orders: data ?? [] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // desactiva cualquier caché intermedia
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
