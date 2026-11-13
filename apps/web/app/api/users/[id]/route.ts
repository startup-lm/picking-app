import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { nonEmptyString } from '@/lib/validation';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return jsonError(400, 'invalid_argument', 'ID inválido');
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid_argument', 'Cuerpo de solicitud inválido');
  }

  const { role, is_active, name } = body;
  if (role === undefined && is_active === undefined && name === undefined) {
    return jsonError(400, 'invalid_argument', 'Se requiere al menos un campo para actualizar');
  }

  const patch: { role?: 'admin' | 'operator'; is_active?: boolean; name?: string } = {};

  if (role !== undefined) {
    if (role !== 'admin' && role !== 'operator') {
      return jsonError(400, 'invalid_argument', 'Rol inválido');
    }
    patch.role = role;
  }

  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return jsonError(400, 'invalid_argument', 'Estado activo inválido');
    }
    patch.is_active = is_active;
  }

  if (name !== undefined) {
    if (!nonEmptyString(name, 100)) {
      return jsonError(400, 'invalid_argument', 'El nombre debe tener entre 1 y 100 caracteres');
    }
    patch.name = (name as string).trim();
  }

  // Si id === auth.user.id y se intenta cambiar role o poner is_active: false
  if (id === auth.user.id && (role !== undefined || is_active === false)) {
    return jsonError(400, 'self_change', 'No podés quitarte permisos a vos mismo');
  }

  const { data: updated, error } = await db
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return rpcErrorResponse(error);
  }

  if (!updated) {
    return jsonError(404, 'not_found', 'Usuario no encontrado');
  }

  return NextResponse.json({ user: updated });
}
