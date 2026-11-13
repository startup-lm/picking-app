import { authFetch, readError } from './http';
import type { ReportDay } from '@/types/rpc';

export async function fetchOrdersByDate(from: string, to: string): Promise<ReportDay[]> {
  const res = await authFetch(`/api/reports/orders-by-date?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const json = await res.json();
  return (json.groups ?? []) as ReportDay[];
}

export async function downloadOrdersCsv(from: string, to: string): Promise<void> {
  const res = await authFetch(`/api/reports/orders-by-date.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_pedidos_${from}_a_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
