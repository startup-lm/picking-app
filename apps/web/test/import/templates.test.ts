import { describe, it, expect } from 'vitest';
import { buildTemplate } from '@/lib/import/templates';
import { readSheet } from '@/lib/import/read';
import { toProductRows, toOrderRows } from '@/lib/import/map';

describe('buildTemplate', () => {
  it('generates products CSV template readable with 2 rows and empty missing', () => {
    const { body, fileName, contentType } = buildTemplate('products', 'csv');
    expect(fileName).toBe('plantilla-productos.csv');
    expect(contentType).toContain('text/csv');

    const sheet = readSheet(body, fileName);
    const { rows, missing } = toProductRows(sheet);

    expect(missing).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].sku).toBe('PF-100');
  });

  it('generates products XLSX template readable with 2 rows and empty missing', () => {
    const { body, fileName, contentType } = buildTemplate('products', 'xlsx');
    expect(fileName).toBe('plantilla-productos.xlsx');
    expect(contentType).toContain('openxmlformats');

    const sheet = readSheet(body, fileName);
    const { rows, missing } = toProductRows(sheet);

    expect(missing).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].sku).toBe('PF-100');
  });

  it('generates orders CSV template readable with 2 rows and empty missing', () => {
    const { body, fileName, contentType } = buildTemplate('orders', 'csv');
    expect(fileName).toBe('plantilla-pedidos.csv');
    expect(contentType).toContain('text/csv');

    const sheet = readSheet(body, fileName);
    const { rows, missing } = toOrderRows(sheet);

    expect(missing).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].order_number).toBe('A-0001');
  });

  it('generates orders XLSX template readable with 2 rows and empty missing', () => {
    const { body, fileName, contentType } = buildTemplate('orders', 'xlsx');
    expect(fileName).toBe('plantilla-pedidos.xlsx');
    expect(contentType).toContain('openxmlformats');

    const sheet = readSheet(body, fileName);
    const { rows, missing } = toOrderRows(sheet);

    expect(missing).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].order_number).toBe('A-0001');
  });
});
