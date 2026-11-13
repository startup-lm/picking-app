import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { isHexColor, isTimezone, nonEmptyString } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const { data: settings, error } = await db
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid_argument', 'Cuerpo de solicitud inválido');
  }

  const allowedKeys = [
    'app_name',
    'primary_color',
    'accent_color',
    'timezone',
    'dispatch_check_enabled',
  ];

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return jsonError(400, 'invalid_argument', 'Se requiere al menos un campo para actualizar');
  }

  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      return jsonError(400, 'invalid_argument', `Campo desconocido: ${k}`);
    }
  }

  const patch: {
    app_name?: string;
    primary_color?: string;
    accent_color?: string;
    timezone?: string;
    dispatch_check_enabled?: boolean;
  } = {};

  if (body.app_name !== undefined) {
    if (!nonEmptyString(body.app_name, 60)) {
      return jsonError(400, 'invalid_argument', 'app_name debe tener entre 1 y 60 caracteres');
    }
    patch.app_name = (body.app_name as string).trim();
  }

  if (body.primary_color !== undefined) {
    if (!isHexColor(body.primary_color)) {
      return jsonError(400, 'invalid_argument', 'primary_color inválido (formato esperado: #RRGGBB)');
    }
    patch.primary_color = body.primary_color;
  }

  if (body.accent_color !== undefined) {
    if (!isHexColor(body.accent_color)) {
      return jsonError(400, 'invalid_argument', 'accent_color inválido (formato esperado: #RRGGBB)');
    }
    patch.accent_color = body.accent_color;
  }

  if (body.timezone !== undefined) {
    if (!isTimezone(body.timezone)) {
      return jsonError(400, 'invalid_argument', 'timezone inválido');
    }
    patch.timezone = (body.timezone as string).trim();
  }

  if (body.dispatch_check_enabled !== undefined) {
    if (typeof body.dispatch_check_enabled !== 'boolean') {
      return jsonError(400, 'invalid_argument', 'dispatch_check_enabled debe ser booleano');
    }
    patch.dispatch_check_enabled = body.dispatch_check_enabled;
  }

  const { data: updated, error } = await db
    .from('app_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({ settings: updated });
}
