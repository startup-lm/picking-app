import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : [];

  if (!ids.length) {
    return new Response('Proporcione "ids": number[]', { status: 400 });
  }

  // Borra en orders; FKs ON DELETE CASCADE deberían limpiar product_order (y lo que hayas configurado)
  const { data, error } = await supabaseAdmin
    .from('orders')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ deleted_count: data?.length ?? 0, deleted_ids: (data ?? []).map(r => r.id) });
}
