import { NextRequest, NextResponse } from 'next/server';
import { getUserClient, jsonError, rpcErrorResponse } from '@/lib/supabase/route';
import { parseProductsCsv } from '@/lib/csv/productos';
import type { ImportProductsResult } from '@/types/rpc';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const db = getUserClient(req);
  if (!db) return jsonError(401, 'unauthorized', 'Sesión requerida');

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return jsonError(400, 'invalid_argument', 'Necesitamos un archivo CSV para continuar.');
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = parseProductsCsv(buf);

    if (!parsed.headers_ok) {
      return jsonError(
        400,
        'invalid_argument',
        'El archivo no tiene los encabezados esperados. Usá: articulo, descripcion, codigo bulto, codigo unidad.'
      );
    }
    if (parsed.items.length === 0) {
      return jsonError(
        400,
        'invalid_argument',
        'No encontramos productos válidos. Asegurate de que la primera columna tenga el artículo.'
      );
    }

    const rows = parsed.items.map(it => ({
      row: it.row,
      sku: it.sku,
      description: it.description || null,
      package_barcode: it.packageCode || null,
      unit_barcode: it.unitCode || null,
    }));

    const { data, error } = await db.rpc('api_import_products', {
      p_rows: rows,
      p_dry_run: false,
    });

    if (error) {
      return rpcErrorResponse(error);
    }

    return NextResponse.json(data as ImportProductsResult);
  } catch (err: any) {
    return jsonError(
      500,
      'internal',
      err?.message || 'Ocurrió un problema al procesar el archivo. Revisá el formato e intentá de nuevo.'
    );
  }
}
