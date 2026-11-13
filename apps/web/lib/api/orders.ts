import { authFetch, readError } from './http';
import type { OrderSummary, ProcessOrderResponse, CancelResponse } from '@/types/api';

export async function processOrderCsv(params: { file: File }): Promise<ProcessOrderResponse> {
  const { file } = params;

  const fd = new FormData();
  fd.append('file', file);

  const res = await authFetch('/api/orders/process-csv', {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as ProcessOrderResponse;
}

export async function fetchPendingOrders(): Promise<OrderSummary[]> {
  const res = await authFetch('/api/orders/pending', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const json = await res.json();
  return json.orders as OrderSummary[];
}

export async function fetchAllOrders(): Promise<OrderSummary[]> {
  const res = await authFetch('/api/orders/all', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const json = await res.json();
  return json.orders as OrderSummary[];
}

export async function cancelOrders(ids: number[], reason: string): Promise<CancelResponse> {
  const res = await authFetch('/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, reason }),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return (await res.json()) as CancelResponse;
}
