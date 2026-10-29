import { DayGroup } from "@/types/api";

export async function fetchOrdersByDate(from: string, to: string) {
  const res = await fetch(`/api/reports/orders-by-date?from=${from}&to=${to}`, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || 'No se pudo obtener el reporte');
  return json.groups as DayGroup[];
}

export function ordersCsvUrl(from: string, to: string) {
  return `/api/reports/orders-by-date.csv?from=${from}&to=${to}`;
}