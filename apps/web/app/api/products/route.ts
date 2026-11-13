import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { escapePostgrestFilter } from '@/lib/supabase/postgrest';
import { handleProductDbError } from '@/lib/api/db-errors';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 100);
  const status = searchParams.get('status') || 'active';
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

  let query = auth.supabase
    .from('products')
    .select('*')
    .order('sku', { ascending: true });

  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (q) {
    const escaped = escapePostgrestFilter(q);
    query = query.or(
      `sku.ilike.%${escaped}%,description.ilike.%${escaped}%,unit_barcode.eq.${escaped},package_barcode.eq.${escaped}`
    );
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // fetch 51 to check hasMore
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) {
    return rpcErrorResponse(error);
  }

  const items = data || [];
  const hasMore = items.length > PAGE_SIZE;
  const products = hasMore ? items.slice(0, PAGE_SIZE) : items;

  return NextResponse.json({ products, hasMore });
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_argument', 'Cuerpo JSON inválido');
  }

  const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const unit_barcode = typeof body.unit_barcode === 'string' ? body.unit_barcode.trim() || null : null;
  const package_barcode = typeof body.package_barcode === 'string' ? body.package_barcode.trim() || null : null;
  const location = typeof body.location === 'string' ? body.location.trim() || null : null;

  if (!sku) {
    return jsonError(400, 'missing_sku', 'El SKU es obligatorio');
  }
  if (!description) {
    return jsonError(400, 'missing_description', 'La descripción es obligatoria');
  }
  if (!unit_barcode && !package_barcode) {
    return jsonError(400, 'missing_barcode', 'Debe ingresar al menos un código de barras (unidad o bulto)');
  }
  if (unit_barcode && package_barcode && unit_barcode === package_barcode) {
    return jsonError(400, 'same_barcode', 'El código de unidad y de bulto no pueden ser iguales');
  }

  let units_per_package = 1;
  if (body.units_per_package !== undefined && body.units_per_package !== null && body.units_per_package !== '') {
    const parsedUpp = Number(body.units_per_package);
    if (!Number.isInteger(parsedUpp) || parsedUpp < 1) {
      return jsonError(400, 'invalid_units_per_package', 'Unidades por bulto debe ser un entero mayor o igual a 1');
    }
    units_per_package = parsedUpp;
  }

  const { data, error } = await auth.supabase
    .from('products')
    .insert({
      sku,
      description,
      unit_barcode,
      package_barcode,
      units_per_package,
      location,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    })
    .select()
    .single();

  if (error) {
    return handleProductDbError(error);
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
