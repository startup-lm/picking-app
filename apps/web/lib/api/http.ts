import { supabase } from '@/lib/supabase/client';

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers || {});
  if (data?.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return fetch(input, {
    ...init,
    headers,
  });
}

export async function readError(res: Response): Promise<string> {
  try {
    const clone = res.clone();
    const data = await clone.json();
    if (data && typeof data === 'object' && typeof data.message === 'string' && data.message) {
      return data.message;
    }
  } catch {
    // fallback to text
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // ignore
  }
  return 'Ocurrió un error inesperado';
}
