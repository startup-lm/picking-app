import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from './helpers/fake-supabase';

let currentClient: any;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => currentClient,
}));

import { GET as getCustomers, POST as postCustomers } from '@/app/api/customers/route';
import { PATCH as patchCustomer } from '@/app/api/customers/[id]/route';

describe('Customers API', () => {
  beforeEach(() => {
    currentClient = fakeSupabase({
      user: { id: 'admin-1', email: 'admin@pickflow.com' },
      profile: { role: 'admin', is_active: true, name: 'Admin Test' },
    });
  });

  describe('GET /api/customers', () => {
    it('returns customers list and hasMore', async () => {
      const mockCustomers = [
        { id: 1, name: 'Ferretería Central', code: 'FC-01', address: 'Av. Corrientes 1234' },
      ];

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          customers: mockCustomers,
        },
      });

      const req = new NextRequest('http://localhost/api/customers?page=0');
      const res = await getCustomers(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.customers.length).toBe(1);
      expect(json.hasMore).toBe(false);
    });

    it('escapes special characters %, _, ,, (, ) in query q', async () => {
      let orArg = '';
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
      });

      const originalFrom = currentClient.from;
      currentClient.from = vi.fn((table: string) => {
        const b = originalFrom(table);
        const originalOr = b.or;
        b.or = vi.fn((arg: string) => {
          orArg = arg;
          return originalOr(arg);
        });
        return b;
      });

      const req = new NextRequest('http://localhost/api/customers?q=ferre_1(10%,20)');
      await getCustomers(req);

      expect(orArg).toContain('ferre\\_1 10\\% 20');
    });
  });

  describe('POST /api/customers', () => {
    it('creates customer and returns 201', async () => {
      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Distribuidora San Juan',
          code: 'DSJ-1',
          address: 'San Juan 500',
        }),
      });

      const res = await postCustomers(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.customer.name).toBe('Distribuidora San Juan');
    });

    it('returns 400 when missing name', async () => {
      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: '  ',
          code: 'CODE-1',
        }),
      });

      const res = await postCustomers(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('missing_name');
    });

    it('returns 409 name_taken when name is duplicated (customers_lower_name_idx)', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableError: {
          customers: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "customers_lower_name_idx"',
          },
        },
      });

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Cliente Existente',
        }),
      });

      const res = await postCustomers(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('name_taken');
    });

    it('returns 409 code_taken when code is duplicated (customers_code_key)', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableError: {
          customers: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "customers_code_key"',
          },
        },
      });

      const req = new NextRequest('http://localhost/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Nuevo Cliente',
          code: 'EXISTING-CODE',
        }),
      });

      const res = await postCustomers(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('code_taken');
    });
  });

  describe('PATCH /api/customers/[id]', () => {
    it('updates customer and returns 200', async () => {
      const existingCustomer = {
        id: 1,
        name: 'Cliente Original',
        code: 'CLI-01',
        address: 'Direccion 1',
      };

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          customers: existingCustomer,
        },
      });

      const req = new NextRequest('http://localhost/api/customers/1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Cliente Modificado',
          address: 'Nueva Dirección 123',
        }),
      });

      const res = await patchCustomer(req, { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.customer.name).toBe('Cliente Modificado');
      expect(json.customer.address).toBe('Nueva Dirección 123');
    });

    it('returns 404 when customer to update does not exist', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          customers: null,
        },
      });

      const req = new NextRequest('http://localhost/api/customers/999', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'No existe',
        }),
      });

      const res = await patchCustomer(req, { params: Promise.resolve({ id: '999' }) });
      expect(res.status).toBe(404);
    });
  });
});
