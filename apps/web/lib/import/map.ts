import { mapHeaders, PRODUCT_ALIASES, ORDER_ALIASES } from './headers';
import { cellText, normalizeDate, normalizePriority } from './values';
import type { Sheet } from './read';

export type ProductImportRow = {
  row: number;
  sku: string;
  description: string;
  unit_barcode: string;
  package_barcode: string;
  units_per_package: string;
  location: string;
};

export type OrderImportRow = {
  row: number;
  order_number: string;
  customer: string;
  sku: string;
  packages: string;
  units: string;
  quantity: string;
  due_date: string;
  priority: string;
  notes: string;
};

export type MapResult<T> = {
  rows: T[];
  ignoredColumns: string[];
  missing: string[];
};

export function toProductRows(sheet: Sheet): MapResult<ProductImportRow> {
  const { index, ignored } = mapHeaders(sheet.headers, PRODUCT_ALIASES);
  const missing: string[] = [];
  if (index.sku === undefined) {
    missing.push('sku');
  }

  const rows: ProductImportRow[] = sheet.rows.map((r, i) => {
    const rowNum = (r as any).row ?? (sheet.firstDataRow + i);
    return {
      row: rowNum,
      sku: index.sku !== undefined ? cellText(r[index.sku]) : '',
      description: index.description !== undefined ? cellText(r[index.description]) : '',
      unit_barcode: index.unit_barcode !== undefined ? cellText(r[index.unit_barcode]) : '',
      package_barcode: index.package_barcode !== undefined ? cellText(r[index.package_barcode]) : '',
      units_per_package: index.units_per_package !== undefined ? cellText(r[index.units_per_package]) : '',
      location: index.location !== undefined ? cellText(r[index.location]) : '',
    };
  });

  return {
    rows,
    ignoredColumns: ignored,
    missing,
  };
}

export function toOrderRows(sheet: Sheet): MapResult<OrderImportRow> {
  const { index, ignored } = mapHeaders(sheet.headers, ORDER_ALIASES);
  const missing: string[] = [];
  if (index.order_number === undefined) {
    missing.push('order_number');
  }
  if (index.sku === undefined) {
    missing.push('sku');
  }
  if (index.packages === undefined && index.units === undefined && index.quantity === undefined) {
    missing.push('bultos/unidades/cantidad');
  }

  const rows: OrderImportRow[] = sheet.rows.map((r, i) => {
    const rowNum = (r as any).row ?? (sheet.firstDataRow + i);
    return {
      row: rowNum,
      order_number: index.order_number !== undefined ? cellText(r[index.order_number]) : '',
      customer: index.customer !== undefined ? cellText(r[index.customer]) : '',
      sku: index.sku !== undefined ? cellText(r[index.sku]) : '',
      packages: index.packages !== undefined ? cellText(r[index.packages]) : '',
      units: index.units !== undefined ? cellText(r[index.units]) : '',
      quantity: index.quantity !== undefined ? cellText(r[index.quantity]) : '',
      due_date: index.due_date !== undefined ? normalizeDate(r[index.due_date]) : '',
      priority: index.priority !== undefined ? normalizePriority(r[index.priority]) : '',
      notes: index.notes !== undefined ? cellText(r[index.notes]) : '',
    };
  });

  return {
    rows,
    ignoredColumns: ignored,
    missing,
  };
}
