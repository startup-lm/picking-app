import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/responses';

export type Role = 'admin' | 'operator';

export type AuthOk = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: { id: string; email: string | null };
  profile: { role: Role; is_active: boolean; name: string };
};

export type AuthFail = {
  ok: false;
  response: Response;
};

export async function requireUser(role: Role = 'admin'): Promise<AuthOk | AuthFail> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: jsonError(401, 'unauthorized', 'Sesión requerida'),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return {
      ok: false,
      response: jsonError(403, 'forbidden', 'Usuario inactivo'),
    };
  }

  if (role === 'admin' && profile.role !== 'admin') {
    return {
      ok: false,
      response: jsonError(403, 'forbidden', 'Requiere rol administrador'),
    };
  }

  return {
    ok: true,
    supabase,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile: {
      role: profile.role as Role,
      is_active: profile.is_active,
      name: profile.name,
    },
  };
}
