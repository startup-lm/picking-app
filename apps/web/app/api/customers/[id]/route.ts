import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError } from '@/lib/api/responses';
import { handleCustomerDbError } from '@/lib/api/db-errors';
import type { Database } from '@/types/supabase';

type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id) || id <= 0) {
    return jsonError(400, 'invalid_argument', 'ID de cliente inválido');
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_argument', 'Cuerpo JSON inválido');
  }

  const updates: CustomerUpdate = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return jsonError(400, 'missing_name', 'El nombre es obligatorio');
    }
    if (name.length > 120) {
      return jsonError(400, 'invalid_argument', 'El nombre debe tener como máximo 120 caracteres');
    }
    updates.name = name;
  }

  if (body.code !== undefined) {
    updates.code = typeof body.code === 'string' ? body.code.trim() || null : null;
  }

  if (body.address !== undefined) {
    updates.address = typeof body.address === 'string' ? body.address.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError(400, 'invalid_argument', 'No se proporcionaron campos para actualizar');
  }

  const { data, error } = await auth.supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return handleCustomerDbError(error);
  }

  if (!data) {
    return jsonError(404, 'not_found', 'Cliente no encontrado');
  }

  return NextResponse.json({ customer: data });
}
