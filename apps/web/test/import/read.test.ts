import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { readSheet, ImportFileError } from '@/lib/import/read';

describe('readSheet', () => {
  it('reads CSV with comma and UTF-8', () => {
    const csv = 'sku,descripcion\nPF-100,Cinta métrica';
    const buf = Buffer.from(csv, 'utf-8');
    const sheet = readSheet(buf, 'test.csv');

    expect(sheet.headers).toEqual(['sku', 'descripcion']);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0]).toEqual(['PF-100', 'Cinta métrica']);
    expect(sheet.firstDataRow).toBe(2);
  });

  it('reads CSV with semicolon and latin1 encoding (accents and leading zeroes preserved)', () => {
    const latin1Text =
      'Código;Descripción;EAN;DUN;Unid. x Bulto;Ubicación\n' +
      'PF-001;Cajón plástico;0001234567890;10001234567897;12;Depósito A';
    const latin1Buf = Buffer.from(latin1Text, 'latin1');

    const sheet = readSheet(latin1Buf, 'products-aliases.csv');

    expect(sheet.headers).toEqual([
      'Código',
      'Descripción',
      'EAN',
      'DUN',
      'Unid. x Bulto',
      'Ubicación',
    ]);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0][1]).toBe('Cajón plástico');
    expect(sheet.rows[0][2]).toBe('0001234567890');
    expect(sheet.rows[0][5]).toBe('Depósito A');
    expect((sheet.rows[0] as any).row).toBe(2);
  });

  it('reads CSV with tab delimiter', () => {
    const tsv = 'pedido\tcliente\nA-1\tFerretería';
    const buf = Buffer.from(tsv, 'utf-8');
    const sheet = readSheet(buf, 'test.txt');

    expect(sheet.headers).toEqual(['pedido', 'cliente']);
    expect(sheet.rows[0]).toEqual(['A-1', 'Ferretería']);
  });

  it('reads CSV with UTF-8 BOM', () => {
    const bomBuf = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('sku,descripcion\nPF-1,Test', 'utf-8'),
    ]);
    const sheet = readSheet(bomBuf, 'test.csv');

    expect(sheet.headers[0]).toBe('sku');
    expect(sheet.rows[0]).toEqual(['PF-1', 'Test']);
  });

  it('reads .xlsx with date cell and numeric code', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['sku', 'fecha', 'codigo'],
      ['PF-100', new Date(2026, 11, 1), '0012345'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const sheet = readSheet(buf, 'test.xlsx');
    expect(sheet.headers).toEqual(['sku', 'fecha', 'codigo']);
    expect(sheet.rows.length).toBe(1);
    expect(sheet.rows[0][0]).toBe('PF-100');
    expect(sheet.rows[0][1]).toBeInstanceOf(Date);
    expect(sheet.rows[0][2]).toBe('0012345');
    expect(sheet.firstDataRow).toBe(2);
    expect((sheet.rows[0] as any).row).toBe(2);
  });

  it('throws unsupported_format for unsupported extensions like .pdf', () => {
    const buf = Buffer.from('%PDF-1.4');
    expect(() => readSheet(buf, 'archivo.pdf')).toThrowError(ImportFileError);
    try {
      readSheet(buf, 'archivo.pdf');
    } catch (e: any) {
      expect(e.code).toBe('unsupported_format');
    }
  });

  it('throws too_many_rows when file exceeds maxRows', () => {
    const lines = ['sku,descripcion'];
    for (let i = 1; i <= 5001; i++) {
      lines.push(`SKU-${i},Producto ${i}`);
    }
    const buf = Buffer.from(lines.join('\n'), 'utf-8');

    expect(() => readSheet(buf, 'grandote.csv')).toThrowError(ImportFileError);
    try {
      readSheet(buf, 'grandote.csv');
    } catch (e: any) {
      expect(e.code).toBe('too_many_rows');
    }
  });

  it('preserves real row numbers when there are intermediate empty rows', () => {
    const csv = 'sku,descripcion\nPF-100,Cinta\n\n   \nPF-101,Aisladora';
    const buf = Buffer.from(csv, 'utf-8');
    const sheet = readSheet(buf, 'test.csv');

    expect(sheet.rows.length).toBe(2);
    expect(sheet.firstDataRow).toBe(2);
    expect((sheet.rows[0] as any).row).toBe(2);
    expect((sheet.rows[1] as any).row).toBe(5);
  });
});
