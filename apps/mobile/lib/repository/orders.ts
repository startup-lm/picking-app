import { supabase } from '@/lib/supabase/client';
import type { OrderStatus, Stage, OrderLine } from '@/types/rpc';

export type OrderListItem = {
  id: number;
  order_number: string;
  status: OrderStatus;
  priority: 'normal' | 'urgent';
  due_date: string | null;
  total_package: number;
  total_unit: number;
  created_at: string;
  customer_name: string;
};

export type OrderDetailLine = OrderLine & {
  product: {
    sku: string;
    description: string;
    unit_barcode: string | null;
    package_barcode: string | null;
    units_per_package: number;
  };
};

export type OrderDetail = {
  id: number;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  notes: string | null;
  total_package: number;
  total_unit: number;
  lines: OrderDetailLine[];
};

export const STAGE_STATUSES: Record<Stage, OrderStatus[]> = {
  picking: ['pending', 'in_progress'],
  dispatch: ['assembled'],
};

export async function listOrders(
  stage: Stage,
  opts?: { orderDir?: 'asc' | 'desc'; page?: number; pageSize?: number }
): Promise<OrderListItem[]> {
  const orderDir = opts?.orderDir ?? 'desc';
  const page = opts?.page ?? 0;
  const pageSize = opts?.pageSize ?? 25;

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, priority, due_date, total_package, total_unit, created_at, customer:customers(name)')
    .in('status', STAGE_STATUSES[stage])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: orderDir === 'asc' })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    order_number: row.order_number,
    status: row.status as OrderStatus,
    priority: row.priority as 'normal' | 'urgent',
    due_date: row.due_date,
    total_package: row.total_package,
    total_unit: row.total_unit,
    created_at: row.created_at,
    customer_name: Array.isArray(row.customer)
      ? row.customer[0]?.name ?? ''
      : row.customer?.name ?? '',
  }));
}

export async function getOrderDetail(id: number): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, notes, total_package, total_unit, customer:customers(name), lines:order_lines(*, product:products(sku, description, unit_barcode, package_barcode, units_per_package))'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const customer_name = Array.isArray(data.customer)
    ? (data.customer as any[])[0]?.name ?? ''
    : (data.customer as any)?.name ?? '';

  const lines = ((data.lines ?? []) as any[]).map((l) => ({
    ...l,
    product: Array.isArray(l.product) ? l.product[0] : l.product,
  })) as OrderDetailLine[];

  return {
    id: data.id,
    order_number: data.order_number,
    status: data.status as OrderStatus,
    customer_name,
    notes: data.notes,
    total_package: data.total_package,
    total_unit: data.total_unit,
    lines,
  };
}
