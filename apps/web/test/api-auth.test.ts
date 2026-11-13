import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase, fakeSupabaseAdmin } from './helpers/fake-supabase';

let currentClient = fakeSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => currentClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: fakeSupabaseAdmin,
}));

// Import all route handlers
import { GET as getOrdersAll } from '@/app/api/orders/all/route';
import { GET as getOrdersPending } from '@/app/api/orders/pending/route';
import { POST as postOrdersCancel } from '@/app/api/orders/cancel/route';
import { GET as getOrdersPrint } from '@/app/api/orders/[id]/print/route';
import { POST as postOrdersProcessCsv } from '@/app/api/orders/process-csv/route';
import { POST as postProductsProcessCsv } from '@/app/api/products/process-csv/route';
import { GET as getReportsOrdersByDate } from '@/app/api/reports/orders-by-date/route';
import { GET as getReportsOrdersByDateCsv } from '@/app/api/reports/orders-by-date.csv/route';
import { GET as getUsers, POST as postUsers } from '@/app/api/users/route';
import { PATCH as patchUser } from '@/app/api/users/[id]/route';
import { GET as getSettings, PATCH as patchSettings } from '@/app/api/settings/route';

type RouteCase = {
  name: string;
  handler: (req: any, ctx?: any) => Promise<Response>;
  method: string;
  url: string;
  ctx?: any;
};

const routes: RouteCase[] = [
  {
    name: 'GET /api/orders/all',
    handler: getOrdersAll,
    method: 'GET',
    url: 'http://localhost/api/orders/all',
  },
  {
    name: 'GET /api/orders/pending',
    handler: getOrdersPending,
    method: 'GET',
    url: 'http://localhost/api/orders/pending',
  },
  {
    name: 'POST /api/orders/cancel',
    handler: postOrdersCancel,
    method: 'POST',
    url: 'http://localhost/api/orders/cancel',
  },
  {
    name: 'GET /api/orders/[id]/print',
    handler: (req) => getOrdersPrint(req, { params: { id: '1' } }),
    method: 'GET',
    url: 'http://localhost/api/orders/1/print',
  },
  {
    name: 'POST /api/orders/process-csv',
    handler: postOrdersProcessCsv,
    method: 'POST',
    url: 'http://localhost/api/orders/process-csv',
  },
  {
    name: 'POST /api/products/process-csv',
    handler: postProductsProcessCsv,
    method: 'POST',
    url: 'http://localhost/api/products/process-csv',
  },
  {
    name: 'GET /api/reports/orders-by-date',
    handler: getReportsOrdersByDate,
    method: 'GET',
    url: 'http://localhost/api/reports/orders-by-date',
  },
  {
    name: 'GET /api/reports/orders-by-date.csv',
    handler: getReportsOrdersByDateCsv,
    method: 'GET',
    url: 'http://localhost/api/reports/orders-by-date.csv',
  },
  {
    name: 'GET /api/users',
    handler: getUsers,
    method: 'GET',
    url: 'http://localhost/api/users',
  },
  {
    name: 'POST /api/users',
    handler: postUsers,
    method: 'POST',
    url: 'http://localhost/api/users',
  },
  {
    name: 'PATCH /api/users/[id]',
    handler: (req) => patchUser(req, { params: { id: '1' } }),
    method: 'PATCH',
    url: 'http://localhost/api/users/1',
  },
  {
    name: 'GET /api/settings',
    handler: getSettings,
    method: 'GET',
    url: 'http://localhost/api/settings',
  },
  {
    name: 'PATCH /api/settings',
    handler: patchSettings,
    method: 'PATCH',
    url: 'http://localhost/api/settings',
  },
];

describe('API Route Authentication and Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  routes.forEach(({ name, handler, method, url }) => {
    describe(name, () => {
      it('returns 401 without session', async () => {
        currentClient = fakeSupabase({ user: null, profile: null });
        const req = new NextRequest(url, { method });
        const res = await handler(req);
        expect(res.status).toBe(401);
      });

      it('returns 403 for active operator', async () => {
        currentClient = fakeSupabase({
          user: { id: 'operator-1', email: 'op@example.com' },
          profile: {
            id: 'operator-1',
            role: 'operator',
            is_active: true,
            name: 'Operador Activo',
          },
        });
        const req = new NextRequest(url, { method });
        const res = await handler(req);
        expect(res.status).toBe(403);
      });

      it('returns 403 for inactive admin', async () => {
        currentClient = fakeSupabase({
          user: { id: 'admin-1', email: 'admin@example.com' },
          profile: {
            id: 'admin-1',
            role: 'admin',
            is_active: false,
            name: 'Admin Inactivo',
          },
        });
        const req = new NextRequest(url, { method });
        const res = await handler(req);
        expect(res.status).toBe(403);
      });
    });
  });
});
