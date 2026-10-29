'use client';
import { supabase } from '@/lib/supabase/client';

const TABLE = 'users';

export async function getSelf(): Promise<User | null> {
  const { data: au, error: e1 } = await supabase.auth.getUser();
  if (e1) throw e1;
  const uid = au.user?.id;
  if (!uid) return null;

  const q = supabase
    .from(TABLE)
    .select('id, name, role, is_active, created_at, updated_at')
    .eq('id', uid)
    .maybeSingle();

  const { data, error, status } = await q;
  console.log('[getSelf] status=', status, 'error=', error?.message, 'data=', data);

  if (error) {
    // Si RLS deniega, verás un error aquí (p.ej. permission denied)
    throw error;
  }
  // Si RLS devolvió 0 filas, data === null
  return (data ?? null) as User | null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, role, is_active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as User | null;
}

export async function updateUserById(
  id: string,
  patch: Partial<Pick<User, 'name' | 'role' | 'is_active'>>
): Promise<User> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('id, name, role, is_active, created_at, updated_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el usuario');
  return data as User;
}

export async function createUser(payload: Pick<User, 'id' | 'name' | 'role' | 'is_active'>): Promise<User> {
  // Aquí 'id' debe venir con el UUID de auth ya creado en el server
  const { data, error } = await supabase
    .from(TABLE)
    .insert([payload])
    .select('id, name, role, is_active, created_at, updated_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el usuario');
  return data as User;
}
