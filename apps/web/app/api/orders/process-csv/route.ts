import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseArmadoCsv, buildLocation } from '@/lib/csv/armado';
import { getProductsMapBySku } from '@/lib/repository/products';
import { updateOrderFile } from '@/lib/repository/orders';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let orderId: number | null = null;

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return new Response('Archivo CSV requerido', { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());

    // 1) Parseo CSV
    const parsed = parseArmadoCsv(buf);
    if (!parsed.headers_ok)        return new Response('CSV vacío o inválido (encabezados)', { status: 400 });
    if (!parsed.client?.trim())    return new Response('Cliente (A1) requerido', { status: 400 });
    if (parsed.items.length === 0) return new Response('Sin ítems válidos (Bultos/Uni sueltas <= 0)', { status: 400 });
    if (parsed.duplicates.length > 0)
      return new Response(`Artículos duplicados en CSV: ${parsed.duplicates.join(', ')}`, { status: 400 });

    // 2) Validar productos por SKU
    const skus = parsed.items.map(it => it.sku.trim());
    const map = await getProductsMapBySku(skus);
    const missing = Array.from(new Set(skus.filter(s => !map.has(s))));
    if (missing.length > 0)
      return new Response(`Artículos inexistentes: ${missing.join(', ')}`, { status: 400 });

    // 3) Preparar líneas para RPC
    const lines = parsed.items.map(it => ({
      product_id: map.get(it.sku.trim())!,
      location: buildLocation(it),
      package_total: it.bultos || 0,
      unit_total: it.uniSueltas || 0,
    }));

    // 4) RPC: crea order + product_order + dispatch + product_dispatch
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'api_create_order_and_dispatch_with_lines',
      { p_client: parsed.client.trim(), p_lines: lines }
    );
    if (rpcError) return new Response(`Error al crear pedido+dispatch: ${rpcError.message}`, { status: 500 });

    orderId = Number((rpcData as any)?.order_id);

    // 5) Subir CSV al bucket
    const cleaned = file.name.replace(/\s+/g, '_');
    const path = `orders/${orderId}/${Date.now()}_${cleaned}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from('orders')
      .upload(path, buf, { contentType: file.type || 'text/csv', upsert: false });

    if (upErr) {
      // rollback: borro la order → CASCADE limpia product_order/dispatch/product_dispatch
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return new Response(`Error al subir archivo: ${upErr.message}`, { status: 500 });
    }

    // 6) Public URL y update de la order
    const { data: pub } = supabaseAdmin.storage.from('orders').getPublicUrl(path);
    const publicUrl = pub?.publicUrl ?? '';
    await updateOrderFile(orderId, file.name, publicUrl);

    // 7) Respuesta
    return new Response(
      JSON.stringify({
        client: parsed.client.trim(),
        order_id: orderId,
        dispatch_id: Number((rpcData as any)?.dispatch_id),
        totals: {
          total_package: Number((rpcData as any)?.total_package),
          total_unit: Number((rpcData as any)?.total_unit),
        },
        file_url: publicUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    if (orderId) {
      // limpieza defensiva si algo explotó luego de crear
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
    }
    return new Response(`Error inesperado: ${err?.message || err}`, { status: 500 });
  }
}
