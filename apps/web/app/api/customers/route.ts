import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-user';
import { jsonError, rpcErrorResponse } from '@/lib/api/responses';
import { escapePostgrestFilter } from '@/lib/supabase/postgrest';
import { handleCustomerDbError } from '@/lib/api/db-errors';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest): Promise<Response> {
  const auth = await requireUser('admin');
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 100);
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

  let query = auth.supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (q) {
    const escaped = escapePostgrestFilter(q);
    query = query.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`);
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) {
    return rpcErrorResponse(error);
  }

  const items = data || [];
  const hasMore = items.length > PAGE_SIZE;
  const customers = hasMore ? items.slice(0, PAGE_SIZE) : items;

  return NextResponse.json({ customers, hasMore });
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

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() || null : null;
  const address = typeof body.address === 'string' ? body.address.trim() || null : null;

  if (!name) {
    return jsonError(400, 'missing_name', 'El nombre es obligatorio');
  }
  if (name.length > 120) {
    return jsonError(400, 'invalid_argument', 'El nombre debe tener como máximo 120 caracteres');
  }

  const { data, error } = await auth.supabase
    .from('customers')
    .insert({
      name,
      code,
      address,
    })
    .select()
    .single();

  if (error) {
    return handleCustomerDbError(error);
  }

  return NextResponse.json({ customer: data }, { status: 201 });
}
