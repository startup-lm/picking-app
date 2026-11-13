import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { errorMessage } from '@/lib/errors';

export function getUserClient(req: Request): SupabaseClient<Database> | null {
  const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!h || !h.startsWith('Bearer ')) {
    return null;
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: h,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ code, message }, { status });
}

export function rpcErrorResponse(e: { message?: string } | null): Response {
  const rawCode = e?.message?.trim() || '';
  let status = 500;
  let code = 'internal';

  if (rawCode === 'forbidden') {
    status = 403;
    code = 'forbidden';
  } else if (rawCode === 'not_found') {
    status = 404;
    code = 'not_found';
  } else if (
    rawCode === 'invalid_argument' ||
    rawCode === 'invalid_transition' ||
    rawCode === 'reason_required' ||
    rawCode === 'incomplete' ||
    rawCode === 'out_of_range' ||
    rawCode === 'invalid_order' ||
    rawCode === 'order_locked'
  ) {
    status = 400;
    code = rawCode;
  } else {
    status = 500;
    code = 'internal';
  }

  const message = errorMessage(e);
  return NextResponse.json({ code, message }, { status });
}
