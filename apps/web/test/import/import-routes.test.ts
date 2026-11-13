import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { fakeSupabase } from '../helpers/fake-supabase';

let currentClient: any;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => currentClient,
}));

import { POST as postImportProducts } from '@/app/api/import/products/route';
import { POST as postImportOrders } from '@/app/api/import/orders/route';
import { GET as getImportTemplate } from '@/app/api/import/template/route';

describe('Import Routes', () => {
  beforeEach(() => {
    currentClient = fakeSupabase({
      user: { id: 'admin-id', email: 'admin@pickflow.com' },
      profile: { role: 'admin', is_active: true, name: 'Admin Test' },
    });
  });

  describe('GET /api/import/template', () => {
    it('returns template with attachment disposition for valid parameters', async () => {
      const req = new NextRequest(
        'http://localhost/api/import/template?kind=products&format=csv'
      );
      const res = await getImportTemplate(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain(
        'attachment; filename="plantilla-productos.csv"'
      );
    });

    it('returns 400 for invalid kind or format', async () => {
      const req = new NextRequest(
        'http://localhost/api/import/template?kind=unknown&format=csv'
      );
      const res = await getImportTemplate(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('invalid_argument');
    });
  });

  describe('POST /api/import/products', () => {
    it('calls api_import_products with p_dry_run: true and 3 rows on products-basic.csv', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/products-basic.csv');
      const buf = fs.readFileSync(fixturePath);
      const file = new File([buf], 'products-basic.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest(
        'http://localhost/api/import/products?dry_run=1',
        {
          method: 'POST',
          body: formData,
        }
      );

      currentClient.rpc = vi.fn(async (fn: string, params: any) => {
        if (fn === 'api_import_products') {
          return {
            data: { dry_run: true, created: 3, updated: 0, errors: [] },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      const res = await postImportProducts(req);
      expect(res.status).toBe(200);

      expect(currentClient.rpc).toHaveBeenCalledWith('api_import_products', {
        p_rows: expect.arrayContaining([
          expect.objectContaining({ sku: 'PF-100' }),
          expect.objectContaining({ sku: 'PF-101' }),
          expect.objectContaining({ sku: 'PF-102' }),
        ]),
        p_dry_run: true,
      });

      const callArgs = currentClient.rpc.mock.calls[0][1];
      expect(callArgs.p_rows.length).toBe(3);

      const json = await res.json();
      expect(json.totalRows).toBe(3);
      expect(json.result.created).toBe(3);
    });

    it('returns 413 file_too_large when file exceeds 5 MB', async () => {
      const bigBuf = new Uint8Array(6 * 1024 * 1024); // 6 MB
      const file = new File([bigBuf], 'giant.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest(
        'http://localhost/api/import/products?dry_run=1',
        {
          method: 'POST',
          body: formData,
        }
      );

      const res = await postImportProducts(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.code).toBe('file_too_large');
    });
  });

  describe('POST /api/import/orders', () => {
    it('dry_run=1 does not create imports record nor upload to storage', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/orders-multi.csv');
      const buf = fs.readFileSync(fixturePath);
      const file = new File([buf], 'orders-multi.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest(
        'http://localhost/api/import/orders?dry_run=1&release=0',
        {
          method: 'POST',
          body: formData,
        }
      );

      currentClient.rpc = vi.fn(async (fn: string, params: any) => {
        if (fn === 'api_import_orders') {
          return {
            data: {
              dry_run: true,
              orders_created: 3,
              lines_created: 6,
              orders: [],
              errors: [],
              warnings: [],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      const res = await postImportOrders(req);
      expect(res.status).toBe(200);

      expect(currentClient.rpc).toHaveBeenCalledWith('api_import_orders', {
        p_rows: expect.any(Array),
        p_release: false,
        p_dry_run: true,
        p_import_id: null,
      });

      const callArgs = currentClient.rpc.mock.calls[0][1];
      expect(callArgs.p_rows.length).toBe(6);

      // Verify no storage upload happened
      expect(currentClient.storage.from).not.toHaveBeenCalled();
    });

    it('dry_run=0 creates imports record, uploads to storage, updates file_path and calls RPC with p_import_id', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/orders-multi.csv');
      const buf = fs.readFileSync(fixturePath);
      const file = new File([buf], 'orders-multi.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);

      const req = new NextRequest(
        'http://localhost/api/import/orders?dry_run=0&release=1',
        {
          method: 'POST',
          body: formData,
        }
      );

      currentClient.rpc = vi.fn(async (fn: string, params: any) => {
        if (fn === 'api_import_orders') {
          return {
            data: {
              dry_run: false,
              orders_created: 3,
              lines_created: 6,
              orders: [],
              errors: [],
              warnings: [],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });

      const uploadMock = vi.fn(async () => ({ data: { path: 'dummy' }, error: null }));
      currentClient.storage.from = vi.fn(() => ({
        upload: uploadMock,
      }));

      const res = await postImportOrders(req);
      expect(res.status).toBe(200);

      // Verify storage upload was called with orders/42/orders-multi.csv
      expect(currentClient.storage.from).toHaveBeenCalledWith('imports');
      expect(uploadMock).toHaveBeenCalledWith(
        'orders/42/orders-multi.csv',
        expect.any(Buffer),
        expect.objectContaining({ upsert: true })
      );

      // Verify RPC was called with p_import_id = 42 and p_release = true
      expect(currentClient.rpc).toHaveBeenCalledWith('api_import_orders', {
        p_rows: expect.any(Array),
        p_release: true,
        p_dry_run: false,
        p_import_id: 42,
      });

      const json = await res.json();
      expect(json.importId).toBe(42);
      expect(json.result.orders_created).toBe(3);
    });
  });
});
