import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase } from './helpers/fake-supabase';

let currentClient: any;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => currentClient,
}));

import { GET as getProducts, POST as postProducts } from '@/app/api/products/route';
import { GET as getProductLookup } from '@/app/api/products/lookup/route';
import { PATCH as patchProduct } from '@/app/api/products/[id]/route';

describe('Products API', () => {
  beforeEach(() => {
    currentClient = fakeSupabase({
      user: { id: 'admin-1', email: 'admin@pickflow.com' },
      profile: { role: 'admin', is_active: true, name: 'Admin Test' },
    });
  });

  describe('GET /api/products', () => {
    it('returns products list and hasMore', async () => {
      const mockProducts = [
        { id: 1, sku: 'PF-100', description: 'Cinta métrica', is_active: true },
        { id: 2, sku: 'PF-101', description: 'Cinta aisladora', is_active: true },
      ];

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          products: mockProducts,
        },
      });

      const req = new NextRequest('http://localhost/api/products?page=0&status=active');
      const res = await getProducts(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products.length).toBe(2);
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

      const req = new NextRequest('http://localhost/api/products?q=item_1(10%,20)');
      await getProducts(req);

      expect(orArg).toContain('item\\_1\\(10\\%\\,20\\)');
    });
  });

  describe('GET /api/products/lookup', () => {
    it('returns product and kind=unit when found in product_barcodes', async () => {
      const barcodeRow = { kind: 'unit', product_id: 10 };
      const productRow = { id: 10, sku: 'PF-10', description: 'Destornillador', is_active: true };

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          product_barcodes: barcodeRow,
          products: productRow,
        },
      });

      const req = new NextRequest('http://localhost/api/products/lookup?code=7790000000017');
      const res = await getProductLookup(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.kind).toBe('unit');
      expect(json.product.sku).toBe('PF-10');
    });

    it('returns product and kind=sku when barcode not found but sku matches', async () => {
      const productRow = { id: 15, sku: 'PF-100', description: 'Cinta métrica', is_active: true };

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          product_barcodes: null,
          products: productRow,
        },
      });

      const req = new NextRequest('http://localhost/api/products/lookup?code=PF-100');
      const res = await getProductLookup(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.kind).toBe('sku');
      expect(json.product.id).toBe(15);
    });

    it('returns 404 when product is not found', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          product_barcodes: null,
          products: null,
        },
      });

      const req = new NextRequest('http://localhost/api/products/lookup?code=NONEXISTENT');
      const res = await getProductLookup(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe('not_found');
    });
  });

  describe('POST /api/products', () => {
    it('creates product and returns 201', async () => {
      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'PF-200',
          description: 'Pinza pico de loro',
          unit_barcode: '7790000000055',
          units_per_package: 1,
          location: 'A-01-1',
        }),
      });

      const res = await postProducts(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.product.sku).toBe('PF-200');
    });

    it('returns 400 when missing sku or description', async () => {
      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: '',
          description: 'Pinza',
          unit_barcode: '123',
        }),
      });
      const res = await postProducts(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('missing_sku');
    });

    it('returns 400 when missing barcodes', async () => {
      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'PF-200',
          description: 'Pinza',
          unit_barcode: '',
          package_barcode: '',
        }),
      });
      const res = await postProducts(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('missing_barcode');
    });

    it('returns 400 when same barcode for unit and package', async () => {
      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'PF-200',
          description: 'Pinza',
          unit_barcode: '7791234567890',
          package_barcode: '7791234567890',
        }),
      });
      const res = await postProducts(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('same_barcode');
    });

    it('handles 409 sku_taken when sku is duplicated', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableError: {
          products: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "products_sku_key"',
          },
        },
      });

      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'PF-EXISTING',
          description: 'Test',
          unit_barcode: '12345',
        }),
      });

      const res = await postProducts(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('sku_taken');
    });

    it('handles 409 barcode_in_use when barcode already assigned to another product', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableError: {
          products: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "product_barcodes_pkey"',
          },
        },
      });

      const req = new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: 'PF-NEW',
          description: 'Test',
          unit_barcode: '7790000000017',
        }),
      });

      const res = await postProducts(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('barcode_in_use');
    });
  });

  describe('PATCH /api/products/[id]', () => {
    it('updates product and returns 200', async () => {
      const existingProduct = {
        id: 1,
        sku: 'PF-200',
        description: 'Pinza original',
        unit_barcode: '7790000000055',
        package_barcode: null,
        units_per_package: 1,
        location: 'A-01-1',
        is_active: true,
      };

      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          products: existingProduct,
        },
      });

      const req = new NextRequest('http://localhost/api/products/1', {
        method: 'PATCH',
        body: JSON.stringify({
          description: 'Pinza modificada',
          units_per_package: 2,
          is_active: false,
        }),
      });

      const res = await patchProduct(req, { params: { id: '1' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.product.description).toBe('Pinza modificada');
      expect(json.product.is_active).toBe(false);
    });

    it('returns 404 when product to update does not exist', async () => {
      currentClient = fakeSupabase({
        user: { id: 'admin-1', email: 'admin@pickflow.com' },
        profile: { role: 'admin', is_active: true, name: 'Admin Test' },
        tableData: {
          products: null,
        },
      });

      const req = new NextRequest('http://localhost/api/products/999', {
        method: 'PATCH',
        body: JSON.stringify({
          description: 'No existe',
        }),
      });

      const res = await patchProduct(req, { params: { id: '999' } });
      expect(res.status).toBe(404);
    });
  });
});
