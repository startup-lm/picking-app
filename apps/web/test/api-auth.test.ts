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
import { GET as getImportTemplate } from '@/app/api/import/template/route';
import { POST as postImportProducts } from '@/app/api/import/products/route';
import { POST as postImportOrders } from '@/app/api/import/orders/route';
import { GET as getProducts, POST as postProducts } from '@/app/api/products/route';
import { GET as getProductsLookup } from '@/app/api/products/lookup/route';
import { PATCH as patchProduct } from '@/app/api/products/[id]/route';
import { GET as getCustomers, POST as postCustomers } from '@/app/api/customers/route';
import { PATCH as patchCustomer } from '@/app/api/customers/[id]/route';

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
  {
    name: 'GET /api/import/template',
    handler: getImportTemplate,
    method: 'GET',
    url: 'http://localhost/api/import/template?kind=products&format=csv',
  },
  {
    name: 'POST /api/import/products',
    handler: postImportProducts,
    method: 'POST',
    url: 'http://localhost/api/import/products?dry_run=1',
  },
  {
    name: 'POST /api/import/orders',
    handler: postImportOrders,
    method: 'POST',
    url: 'http://localhost/api/import/orders?dry_run=1',
  },
  {
    name: 'GET /api/products',
    handler: getProducts,
    method: 'GET',
    url: 'http://localhost/api/products',
  },
  {
    name: 'POST /api/products',
    handler: postProducts,
    method: 'POST',
    url: 'http://localhost/api/products',
  },
  {
    name: 'GET /api/products/lookup',
    handler: getProductsLookup,
    method: 'GET',
    url: 'http://localhost/api/products/lookup?code=PF-1',
  },
  {
    name: 'PATCH /api/products/[id]',
    handler: (req) => patchProduct(req, { params: { id: '1' } }),
    method: 'PATCH',
    url: 'http://localhost/api/products/1',
  },
  {
    name: 'GET /api/customers',
    handler: getCustomers,
    method: 'GET',
    url: 'http://localhost/api/customers',
  },
  {
    name: 'POST /api/customers',
    handler: postCustomers,
    method: 'POST',
    url: 'http://localhost/api/customers',
  },
  {
    name: 'PATCH /api/customers/[id]',
    handler: (req) => patchCustomer(req, { params: { id: '1' } }),
    method: 'PATCH',
    url: 'http://localhost/api/customers/1',
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
