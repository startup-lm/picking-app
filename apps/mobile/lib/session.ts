import { supabase } from '@/lib/supabase/client';

export type UserProfile = {
  id: string;
  name: string;
  role: 'admin' | 'operator';
  is_active: boolean;
};

export type FetchProfileResult =
  | { status: 'ok'; profile: UserProfile }
  | { status: 'missing' }
  | { status: 'error'; error: unknown };

let signOutReason: 'expired' | 'inactive' | null = null;

export async function fetchOwnProfile(): Promise<FetchProfileResult> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { status: 'error', error: userError };
    }
    if (!user) {
      return { status: 'missing' };
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return { status: 'error', error: profileError };
    }

    if (!data) {
      return { status: 'missing' };
    }

    return { status: 'ok', profile: data as UserProfile };
  } catch (error) {
    return { status: 'error', error };
  }
}

export function isAuthError(e: unknown): boolean {
  if (!e) return false;

  let msg = '';
  let status: number | string | undefined;

  if (typeof e === 'string') {
    msg = e;
  } else if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string') {
      msg = obj.message;
    }
    if (typeof obj.status === 'number' || typeof obj.status === 'string') {
      status = obj.status;
    } else if (typeof obj.statusCode === 'number' || typeof obj.statusCode === 'string') {
      status = obj.statusCode;
    } else if (typeof obj.code === 'number' || typeof obj.code === 'string') {
      status = obj.code;
    }
  }

  if (status === 401 || status === '401') {
    return true;
  }

  const lower = msg.toLowerCase();
  if (
    msg.includes('JWT') ||
    msg.includes('refresh_token') ||
    lower.includes('jwt') ||
    lower.includes('refresh_token')
  ) {
    return true;
  }

  return false;
}

export async function signOut(reason?: 'expired' | 'inactive'): Promise<void> {
  signOutReason = reason ?? null;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export function consumeSignOutReason(): 'expired' | 'inactive' | null {
  const reason = signOutReason;
  signOutReason = null;
  return reason;
}
