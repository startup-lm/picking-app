import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readSheet } from '@/lib/import/read';
import { toProductRows, toOrderRows } from '@/lib/import/map';

describe('toProductRows', () => {
  it('maps products-aliases.csv correctly with latin1 bytes', () => {
    const latin1Text =
      'Código;Descripción;EAN;DUN;Unid. x Bulto;Ubicación\n' +
      'PF-001;Cajón plástico;0001234567890;10001234567897;12;Depósito A';
    const latin1Buf = Buffer.from(latin1Text, 'latin1');

    const sheet = readSheet(latin1Buf, 'products-aliases.csv');
    const { rows, ignoredColumns, missing } = toProductRows(sheet);

    expect(missing).toEqual([]);
    expect(ignoredColumns).toEqual([]);
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual({
      row: 2,
      sku: 'PF-001',
      description: 'Cajón plástico',
      unit_barcode: '0001234567890',
      package_barcode: '10001234567897',
      units_per_package: '12',
      location: 'Depósito A',
    });
  });

  it('detects missing sku column', () => {
    const sheet = {
      headers: ['descripcion', 'codigo_unidad'],
      rows: [['Cinta', '7790000000017']],
      firstDataRow: 2,
    };
    const { missing } = toProductRows(sheet);
    expect(missing).toEqual(['sku']);
  });
});

describe('toOrderRows', () => {
  it('maps orders-multi.csv correctly', () => {
    const fixturePath = path.join(__dirname, '../fixtures/orders-multi.csv');
    const buf = fs.readFileSync(fixturePath);

    const sheet = readSheet(buf, 'orders-multi.csv');
    const { rows, ignoredColumns, missing } = toOrderRows(sheet);

    expect(missing).toEqual([]);
    expect(ignoredColumns).toEqual(['Vendedor']);
    expect(rows.length).toBe(6);

    // Row with Cantidad 29
    const row29 = rows.find((r) => r.quantity === '29');
    expect(row29).toBeDefined();
    expect(row29!.packages).toBe('');
    expect(row29!.units).toBe('');
    expect(row29!.quantity).toBe('29');
    expect(row29!.due_date).toBe('2026-12-01');
    expect(row29!.priority).toBe('urgent');
  });

  it('detects missing order_number, sku and quantity/packages/units columns', () => {
    const sheet = {
      headers: ['cliente', 'fecha_entrega'],
      rows: [['Cliente Uno', '2026-12-01']],
      firstDataRow: 2,
    };
    const { missing } = toOrderRows(sheet);
    expect(missing).toContain('order_number');
    expect(missing).toContain('sku');
    expect(missing).toContain('bultos/unidades/cantidad');
  });
});
