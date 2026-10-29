import { PendingOrder, ProcessOrderResponse } from "@/types/api";

export async function processOrderCsv(params: { file: File }) {
  const { file } = params;

  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch('/api/orders/process-csv', {
    method: 'POST',
    body: fd,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || 'Error procesando CSV');

  return JSON.parse(text) as ProcessOrderResponse;
}

export async function fetchPendingOrders(): Promise<PendingOrder[]> {
  const url = `/api/orders/pending`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'No se pudieron obtener los pedidos pendientes');
  return json.orders as PendingOrder[];
}

export async function cancelOrders(ids: number[]): Promise<{ deleted_count: number; deleted_ids: number[] }> {
  const res = await fetch('/api/orders/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'No se pudieron cancelar los pedidos');
  return json as { deleted_count: number; deleted_ids: number[] };
}

export async function fetchAllOrders(): Promise<PendingOrder[]> {
  const url = `/api/orders/all?t=${Date.now()}`; // cache-buster
  const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'No se pudieron obtener los pedidos');
  return json.orders as PendingOrder[];
}