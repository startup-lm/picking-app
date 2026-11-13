import { NextRequest, NextResponse } from 'next/server';
import { getUserClient, jsonError, rpcErrorResponse } from '@/lib/supabase/route';
import { parseArmadoCsv } from '@/lib/csv/armado';
import type { ProcessOrderResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const db = getUserClient(req);
  if (!db) return jsonError(401, 'unauthorized', 'Sesión requerida');

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return jsonError(400, 'invalid_argument', 'Archivo CSV requerido');
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = parseArmadoCsv(buf);

    if (!parsed.headers_ok) {
      return jsonError(400, 'invalid_argument', 'CSV vacío o inválido (encabezados)');
    }
    if (!parsed.client?.trim()) {
      return jsonError(400, 'invalid_argument', 'Cliente (A1) requerido');
    }
    if (parsed.items.length === 0) {
      return jsonError(400, 'invalid_argument', 'Sin ítems válidos (Bultos/Uni sueltas <= 0)');
    }
    if (parsed.duplicates.length > 0) {
      return jsonError(400, 'invalid_argument', `Artículos duplicados en CSV: ${parsed.duplicates.join(', ')}`);
    }

    const skus = Array.from(new Set(parsed.items.map(it => it.sku.trim())));
    const { data: dbProducts, error: prodErr } = await db
      .from('products')
      .select('id, sku, is_active')
      .in('sku', skus);

    if (prodErr) {
      return rpcErrorResponse(prodErr);
    }

    const prodMap = new Map<string, { id: number; is_active: boolean }>();
    (dbProducts ?? []).forEach(p => {
      prodMap.set(p.sku.trim(), { id: p.id, is_active: p.is_active });
    });

    const missing: string[] = [];
    const inactive: string[] = [];

    for (const s of skus) {
      const p = prodMap.get(s);
      if (!p) {
        missing.push(s);
      } else if (!p.is_active) {
        inactive.push(s);
      }
    }

    if (missing.length > 0 || inactive.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) parts.push(`inexistentes: ${missing.join(', ')}`);
      if (inactive.length > 0) parts.push(`inactivos: ${inactive.join(', ')}`);
      return jsonError(400, 'invalid_order', `Artículos ${parts.join('; ')}`);
    }

    const lines = parsed.items.map(it => {
      const p = prodMap.get(it.sku.trim())!;
      return {
        product_id: p.id,
        package_total: it.bultos || 0,
        unit_total: it.uniSueltas || 0,
      };
    });

    const { data: rpcData, error: rpcErr } = await db.rpc('api_save_order', {
      p_order: {
        customer_name: parsed.client.trim(),
        release: true,
        lines,
      },
    });

    if (rpcErr) {
      return rpcErrorResponse(rpcErr);
    }

    const saved = rpcData as { order_id: number; order_number: string; status: string };

    const response: ProcessOrderResponse = {
      order_id: saved.order_id,
      order_number: saved.order_number,
      customer: parsed.client.trim(),
      totals: {
        total_package: parsed.total_package,
        total_unit: parsed.total_unit,
      },
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return jsonError(500, 'internal', err?.message || 'Error inesperado al procesar el pedido');
  }
}
