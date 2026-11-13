import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase, fakeSupabaseAdmin } from './helpers/fake-supabase';

const adminUser = { id: 'admin-1', email: 'admin@pickflow.com' };
const adminProfile = { id: 'admin-1', role: 'admin', is_active: true, name: 'Admin Test' };

function makeAdminSupabase(opts: any = {}) {
  return fakeSupabase({
    user: adminUser,
    profile: adminProfile,
    ...opts,
  });
}

let currentClient = makeAdminSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => currentClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: fakeSupabaseAdmin,
}));

import { GET as getOrders, POST as postOrders } from '@/app/api/orders/route';
import { GET as getOrder } from '@/app/api/orders/[id]/route';
import { POST as postOrderStatus } from '@/app/api/orders/[id]/status/route';
import { GET as getOrdersPrint } from '@/app/api/orders/[id]/print/route';

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentClient = makeAdminSupabase();
  });

  describe('GET /api/orders', () => {
    it('returns orders with calculated progress and strips lines', async () => {
      const mockOrders = [
        {
          id: 1,
          order_number: 'PED-001',
          status: 'pending',
          priority: 'normal',
          due_date: '2026-11-20',
          created_at: '2026-11-13T10:00:00Z',
          total_package: 5,
          total_unit: 10,
          customer: { name: 'Cliente A' },
          lines: [
            { package_scanned: 2, unit_scanned: 3, package_checked: 0, unit_checked: 0 },
            { package_scanned: 1, unit_scanned: 2, package_checked: 1, unit_checked: 1 },
          ],
        },
      ];

      currentClient = makeAdminSupabase({
        tableData: {
          orders: mockOrders,
          app_settings: [{ id: 1, timezone: 'America/Argentina/Buenos_Aires' }],
        },
      });

      const req = new NextRequest('http://localhost/api/orders');
      const res = await getOrders(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orders).toHaveLength(1);
      expect(json.orders[0].lines).toBeUndefined();
      expect(json.orders[0].progress).toEqual({
        scanned: 8, // (2+3) + (1+2)
        checked: 2, // (0+0) + (1+1)
        total: 15, // 5 + 10
      });
      expect(json.hasMore).toBe(false);
    });

    it('filters by status and search q', async () => {
      currentClient = makeAdminSupabase({
        tableData: {
          customers: [{ id: 42, name: 'Ferretería Central' }],
          orders: [],
          app_settings: [{ id: 1, timezone: 'America/Argentina/Buenos_Aires' }],
        },
      });

      const req = new NextRequest('http://localhost/api/orders?status=draft,pending&q=Ferreter%C3%ADa');
      const res = await getOrders(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orders).toEqual([]);
    });

    it('filters by date range from and to', async () => {
      currentClient = makeAdminSupabase({
        tableData: {
          orders: [],
          app_settings: [{ id: 1, timezone: 'America/Argentina/Buenos_Aires' }],
        },
      });

      const req = new NextRequest('http://localhost/api/orders?from=2026-11-01&to=2026-11-13');
      const res = await getOrders(req);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/orders', () => {
    it('rejects empty or missing lines array with 400', async () => {
      currentClient = makeAdminSupabase();

      const req = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: [] }),
      });
      const res = await postOrders(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('invalid_order');
    });

    it('rejects negative quantities in lines', async () => {
      currentClient = makeAdminSupabase();

      const req = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{ product_id: 1, package_total: -2, unit_total: 5 }],
        }),
      });
      const res = await postOrders(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('invalid_argument');
    });

    it('calls api_save_order and passes detail on invalid_order', async () => {
      currentClient = makeAdminSupabase({
        rpcHandler: async (name: string) => {
          if (name === 'api_save_order') {
            return {
              data: null,
              error: {
                message: 'invalid_order',
                details: 'duplicate_product',
              },
            };
          }
          return { data: null, error: null };
        },
      });

      const req = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Cliente Test',
          lines: [
            { product_id: 1, package_total: 1, unit_total: 0 },
            { product_id: 1, package_total: 2, unit_total: 0 },
          ],
        }),
      });
      const res = await postOrders(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('invalid_order');
      expect(json.detail).toBe('duplicate_product');
    });

    it('returns 409 when order is locked', async () => {
      currentClient = makeAdminSupabase({
        rpcHandler: async (name: string) => {
          if (name === 'api_save_order') {
            return {
              data: null,
              error: {
                message: 'order_locked',
              },
            };
          }
          return { data: null, error: null };
        },
      });

      const req = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 10,
          lines: [{ product_id: 1, package_total: 1, unit_total: 0 }],
        }),
      });
      const res = await postOrders(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('order_locked');
    });

    it('returns 200 with order result on success', async () => {
      currentClient = makeAdminSupabase({
        rpcHandler: async (name: string) => {
          if (name === 'api_save_order') {
            return {
              data: {
                order_id: 123,
                order_number: 'PED-123',
                status: 'pending',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      });

      const req = new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Cliente Valido',
          release: true,
          lines: [{ product_id: 1, package_total: 2, unit_total: 0 }],
        }),
      });
      const res = await postOrders(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.order_id).toBe(123);
      expect(json.order_number).toBe('PED-123');
      expect(json.status).toBe('pending');
    });
  });

  describe('GET /api/orders/[id]', () => {
    it('returns 400 for invalid ID', async () => {
      currentClient = makeAdminSupabase();
      const req = new NextRequest('http://localhost/api/orders/abc');
      const res = await getOrder(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when order does not exist', async () => {
      currentClient = makeAdminSupabase({
        tableData: { orders: [] },
      });
      const req = new NextRequest('http://localhost/api/orders/999');
      const res = await getOrder(req, { params: Promise.resolve({ id: '999' }) });
      expect(res.status).toBe(404);
    });

    it('returns order with lines sorted naturally by location and user profile names', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'PED-001',
        status: 'in_progress',
        created_by: 'user-created',
        started_by: 'user-started',
        assembled_by: null,
        dispatched_by: null,
        cancelled_by: null,
        customer: { id: 1, name: 'Cliente Especial' },
        lines: [
          {
            id: 101,
            location: 'A-10-1',
            package_total: 1,
            unit_total: 0,
            product: { sku: 'PF-B', description: 'Item B' },
          },
          {
            id: 102,
            location: 'A-2-1',
            package_total: 2,
            unit_total: 0,
            product: { sku: 'PF-A', description: 'Item A' },
          },
        ],
      };

      currentClient = makeAdminSupabase({
        tableData: {
          orders: [mockOrder],
          profiles: [
            { id: 'user-created', name: 'Creador Nombre', email: 'c@test.com' },
            { id: 'user-started', name: 'Preparador Nombre', email: 'p@test.com' },
          ],
        },
      });

      const req = new NextRequest('http://localhost/api/orders/1');
      const res = await getOrder(req, { params: Promise.resolve({ id: '1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.order_number).toBe('PED-001');
      expect(json.created_by_name).toBe('Creador Nombre');
      expect(json.started_by_name).toBe('Preparador Nombre');
      // Natural sort: A-2-1 comes before A-10-1
      expect(json.lines[0].location).toBe('A-2-1');
      expect(json.lines[1].location).toBe('A-10-1');
    });
  });

  describe('POST /api/orders/[id]/status', () => {
    it('returns 400 for invalid status', async () => {
      currentClient = makeAdminSupabase();
      const req = new NextRequest('http://localhost/api/orders/1/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invalid_status' }),
      });
      const res = await postOrderStatus(req, { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(400);
    });

    it('requires reason when status is cancelled', async () => {
      currentClient = makeAdminSupabase();
      const req = new NextRequest('http://localhost/api/orders/1/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', reason: '   ' }),
      });
      const res = await postOrderStatus(req, { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('reason_required');
    });

    it('calls api_set_order_status and returns updated order on success', async () => {
      currentClient = makeAdminSupabase({
        rpcHandler: async (name: string, args: any) => {
          if (name === 'api_set_order_status') {
            return {
              data: {
                id: args.p_order_id,
                status: args.p_status,
                cancel_reason: args.p_reason,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      });

      const req = new NextRequest('http://localhost/api/orders/5/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', reason: 'Pedido duplicado por cliente' }),
      });
      const res = await postOrderStatus(req, { params: Promise.resolve({ id: '5' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('cancelled');
      expect(json.cancel_reason).toBe('Pedido duplicado por cliente');
    });
  });

  describe('GET /api/orders/[id]/print', () => {
    it('renders print HTML with notes and due_date in header and natural location sorting', async () => {
      const mockOrder = {
        id: 7,
        order_number: 'PED-007',
        total_package: 3,
        total_unit: 10,
        due_date: '2026-12-15',
        notes: 'Entregar antes de las 14hs',
        customer: { name: 'Distribuidora Norte' },
        lines: [
          {
            location: 'B-10',
            package_total: 1,
            unit_total: 0,
            product: { sku: 'SKU-2', description: 'Producto 2' },
          },
          {
            location: 'B-2',
            package_total: 2,
            unit_total: 10,
            product: { sku: 'SKU-1', description: 'Producto 1' },
          },
        ],
      };

      currentClient = makeAdminSupabase({
        tableData: { orders: [mockOrder] },
      });

      const req = new NextRequest('http://localhost/api/orders/7/print');
      const res = await getOrdersPrint(req, { params: Promise.resolve({ id: '7' }) });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Distribuidora Norte');
      expect(html).toContain('PED-007');
      expect(html).toContain('2026-12-15');
      expect(html).toContain('Entregar antes de las 14hs');
      // Natural sorting: B-2 appears before B-10 in table
      const idxB2 = html.indexOf('B-2');
      const idxB10 = html.indexOf('B-10');
      expect(idxB2).toBeGreaterThan(-1);
      expect(idxB10).toBeGreaterThan(-1);
      expect(idxB2).toBeLessThan(idxB10);
    });
  });
});
