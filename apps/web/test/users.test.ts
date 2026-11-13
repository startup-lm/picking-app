import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase, fakeSupabaseAdmin } from './helpers/fake-supabase';

let currentClient = fakeSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => currentClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: fakeSupabaseAdmin,
}));

import { POST as postUsers } from '@/app/api/users/route';
import { PATCH as patchUser } from '@/app/api/users/[id]/route';

describe('Users API Endpoints', () => {
  it('rejects self-deactivation with 400 self_change', async () => {
    currentClient = fakeSupabase({
      user: { id: 'admin-self-id', email: 'admin@pickflow.com' },
      profile: {
        id: 'admin-self-id',
        role: 'admin',
        is_active: true,
        name: 'Administrador Principal',
      },
    });

    const req = new NextRequest('http://localhost/api/users/admin-self-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const res = await patchUser(req, { params: { id: 'admin-self-id' } });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('self_change');
    expect(data.message).toBe('No podés quitarte permisos a vos mismo');
  });

  it('rejects self-role change with 400 self_change', async () => {
    currentClient = fakeSupabase({
      user: { id: 'admin-self-id', email: 'admin@pickflow.com' },
      profile: {
        id: 'admin-self-id',
        role: 'admin',
        is_active: true,
        name: 'Administrador Principal',
      },
    });

    const req = new NextRequest('http://localhost/api/users/admin-self-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'operator' }),
    });

    const res = await patchUser(req, { params: { id: 'admin-self-id' } });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('self_change');
  });

  it('rejects invitation with invalid email with 400 invalid_argument', async () => {
    currentClient = fakeSupabase({
      user: { id: 'admin-self-id', email: 'admin@pickflow.com' },
      profile: {
        id: 'admin-self-id',
        role: 'admin',
        is_active: true,
        name: 'Administrador Principal',
      },
    });

    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-address',
        name: 'Juan Perez',
        role: 'operator',
      }),
    });

    const res = await postUsers(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('invalid_argument');
  });
});
