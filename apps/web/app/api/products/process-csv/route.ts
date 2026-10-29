import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseProductsCsv } from '@/lib/csv/productos';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return new Response('Necesitamos un archivo CSV para continuar.', { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = parseProductsCsv(buf);

    if (!parsed.headers_ok) {
      return new Response(
        'El archivo no tiene los encabezados esperados. Usá: articulo, descripcion, codigo bulto, codigo unidad.',
        { status: 400 }
      );
    }
    if (parsed.items.length === 0) {
      return new Response(
        'No encontramos productos válidos. Asegurate de que la primera columna tenga el artículo.',
        { status: 400 }
      );
    }

    const rows = parsed.items.map(it => ({
      sku: it.sku,
      description: it.description || null,
      package_barcode: it.packageCode || null,
      unit_barcode: it.unitCode || null,
    }));

    const { error } = await supabaseAdmin
      .from('products')
      .upsert(rows, { onConflict: 'sku' });
    if (error) {
      return new Response(
        'No pudimos guardar los productos. Intentá nuevamente o contactá a soporte.',
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        processed: rows.length,
        duplicates: parsed.duplicates.length,
        total_rows: parsed.total_rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      'Ocurrió un problema al procesar el archivo. Revisá el formato e intentá de nuevo.',
      { status: 500 }
    );
  }
}
