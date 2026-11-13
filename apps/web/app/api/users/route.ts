import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { isEmail, nonEmptyString } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const { data: users, error } = await db
    .from('profiles')
    .select('id, name, email, role, is_active, created_at')
    .order('created_at');

  if (error) {
    return rpcErrorResponse(error);
  }

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser('admin');
  if (!auth.ok) return auth.response;
  const db = auth.supabase;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid_argument', 'Cuerpo de solicitud inválido');
  }

  const { email, name, role } = body;

  if (!isEmail(email)) {
    return jsonError(400, 'invalid_argument', 'Email inválido');
  }
  if (!nonEmptyString(name, 100)) {
    return jsonError(400, 'invalid_argument', 'El nombre debe tener entre 1 y 100 caracteres');
  }
  if (role !== 'admin' && role !== 'operator') {
    return jsonError(400, 'invalid_argument', 'El rol debe ser admin u operator');
  }

  const trimmedEmail = (email as string).trim().toLowerCase();
  const trimmedName = (name as string).trim();
  const origin = new URL(req.url).origin;

  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    trimmedEmail,
    {
      data: { name: trimmedName },
      redirectTo: `${origin}/update-password`,
    }
  );

  if (inviteError) {
    const msg = inviteError.message || '';
    const status = (inviteError as any).status;
    if (status === 422 || /already/i.test(msg) || /exists/i.test(msg)) {
      return jsonError(409, 'user_exists', 'El usuario ya existe');
    }
    return jsonError(500, 'internal', msg || 'Error al invitar al usuario');
  }

  if (!invited?.user?.id) {
    return jsonError(500, 'internal', 'No se pudo crear la invitación');
  }

  const { error: updateError } = await db
    .from('profiles')
    .update({ role, is_active: true, name: trimmedName })
    .eq('id', invited.user.id);

  if (updateError) {
    return rpcErrorResponse(updateError);
  }

  return NextResponse.json(
    {
      user: {
        id: invited.user.id,
        email: trimmedEmail,
        name: trimmedName,
        role,
        is_active: true,
      },
    },
    { status: 201 }
  );
}
