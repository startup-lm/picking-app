import type { Tables } from './supabase';

export type OrderStatus = 'draft' | 'pending' | 'in_progress' | 'assembled' | 'dispatched' | 'cancelled';
export type Stage = 'picking' | 'dispatch';
export type ScanKind = 'unit' | 'package';
export type OrderLine = Tables<'order_lines'>;
export type ScanResult = { status: 'ok' | 'duplicate'; line: OrderLine; order_status: OrderStatus };
export type FindLineResult = { line: OrderLine; kind: ScanKind; product: { id: number; sku: string; description: string; units_per_package: number } };
export type ImportError = { row: number; code: string; sku?: string; order_number?: string; field?: string };
export type ImportProductsResult = { dry_run: boolean; created: number; updated: number; errors: ImportError[] };
export type ImportOrdersResult = { dry_run: boolean; orders_created: number; lines_created: number; orders: { order_number: string; order_id: number; lines: number; status: OrderStatus }[]; errors: ImportError[]; warnings: ImportError[] };
export type SaveOrderResult = { order_id: number; order_number: string; status: OrderStatus };
export type ReportLine = { sku: string; description: string; location: string | null; package_total: number; unit_total: number; package_scanned: number; unit_scanned: number };
export type ReportOrder = { id: number; order_number: string; customer: string; status: OrderStatus; priority: 'normal' | 'urgent'; assembled_at: string; assembled_by_name: string | null; dispatched_at: string | null; total_package: number; total_unit: number; lines: ReportLine[] };
export type ReportDay = { day: string; orders: ReportOrder[] };
