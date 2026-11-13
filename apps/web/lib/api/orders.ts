import { authFetch, readError } from './http';
import type { CancelResponse } from '@/types/api';

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
