import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError } from '@/lib/api/responses';
import { handleProductDbError } from '@/lib/api/db-errors';
import type { Database } from '@/types/supabase';

type ProductUpdate = Database['public']['Tables']['products']['Update'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id) || id <= 0) {
    return jsonError(400, 'invalid_argument', 'ID de producto inválido');
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_argument', 'Cuerpo JSON inválido');
  }

  const updates: ProductUpdate = {};

  if (body.sku !== undefined) {
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    if (!sku) {
      return jsonError(400, 'missing_sku', 'El SKU es obligatorio');
    }
    updates.sku = sku;
  }

  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return jsonError(400, 'missing_description', 'La descripción es obligatoria');
    }
    updates.description = description;
  }

  if (body.unit_barcode !== undefined) {
    updates.unit_barcode = typeof body.unit_barcode === 'string' ? body.unit_barcode.trim() || null : null;
  }

  if (body.package_barcode !== undefined) {
    updates.package_barcode = typeof body.package_barcode === 'string' ? body.package_barcode.trim() || null : null;
  }

  if (body.units_per_package !== undefined) {
    const parsedUpp = Number(body.units_per_package);
    if (!Number.isInteger(parsedUpp) || parsedUpp < 1) {
      return jsonError(400, 'invalid_units_per_package', 'Unidades por bulto debe ser un entero mayor o igual a 1');
    }
    updates.units_per_package = parsedUpp;
  }

  if (body.location !== undefined) {
    updates.location = typeof body.location === 'string' ? body.location.trim() || null : null;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return jsonError(400, 'invalid_argument', 'No se proporcionaron campos para actualizar');
  }

  const { data, error } = await auth.supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return handleProductDbError(error);
  }

  if (!data) {
    return jsonError(404, 'not_found', 'Producto no encontrado');
  }

  return NextResponse.json({ product: data });
}
