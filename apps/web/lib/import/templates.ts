import * as XLSX from 'xlsx';
import { PRODUCT_ALIASES, ORDER_ALIASES, type ProductField, type OrderField } from './headers';

const PRODUCT_FIELDS: ProductField[] = [
  'sku',
  'description',
  'unit_barcode',
  'package_barcode',
  'units_per_package',
  'location',
];

const ORDER_FIELDS: OrderField[] = [
  'order_number',
  'customer',
  'sku',
  'packages',
  'units',
  'quantity',
  'due_date',
  'priority',
  'notes',
];

const PRODUCT_EXAMPLE_ROWS: string[][] = [
  ['PF-100', 'Cinta métrica 5m', '7790000000017', '17790000000014', '12', 'A-01-1'],
  ['PF-101', 'Cinta aisladora 10m', '7790000000024', '17790000000021', '24', 'A-01-2'],
];

const ORDER_EXAMPLE_ROWS: string[][] = [
  ['A-0001', 'Ferretería Ejemplo', 'PF-100', '2', '5', '', '2026-12-01', 'normal', 'Entregar por la mañana'],
  ['A-0001', 'Ferretería Ejemplo', 'PF-101', '', '', '29', '', '', ''],
];

function toCsvRow(row: string[]): string {
  return row
    .map((val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

export function buildTemplate(
  kind: 'products' | 'orders',
  format: 'csv' | 'xlsx'
): { body: Buffer; contentType: string; fileName: string } {
  const headers =
    kind === 'products'
      ? PRODUCT_FIELDS.map((f) => PRODUCT_ALIASES[f][0])
      : ORDER_FIELDS.map((f) => ORDER_ALIASES[f][0]);

  const rows = kind === 'products' ? PRODUCT_EXAMPLE_ROWS : ORDER_EXAMPLE_ROWS;
  const namePrefix = kind === 'products' ? 'plantilla-productos' : 'plantilla-pedidos';
  const fileName = `${namePrefix}.${format}`;

  if (format === 'csv') {
    const csvLines = [toCsvRow(headers), ...rows.map(toCsvRow)];
    const csvContent = csvLines.join('\r\n') + '\r\n';
    return {
      body: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      fileName,
    };
  }

  // format === 'xlsx'
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const codeHeaders = new Set(['sku', 'codigo_unidad', 'codigo_bulto', 'pedido']);
  headers.forEach((h, colIdx) => {
    if (codeHeaders.has(h)) {
      for (let rowIdx = 0; rowIdx < aoa.length; rowIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        const cell = ws[cellAddress];
        if (cell) {
          cell.t = 's';
          cell.z = '@';
          cell.v = String(cell.v ?? '');
        }
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, kind === 'products' ? 'Productos' : 'Pedidos');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    body: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName,
  };
}
