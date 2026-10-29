import { useEffect, useState } from 'react';
import { getOrderById } from '@/lib/repository/orders';
import type { Order } from '@/types/db';

export function useOrderStatus(orderId: string) {
  const [status, setStatus] = useState<Order['status']>('pending');

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const o = await getOrderById(Number(orderId)); // ya alerta si falla
      if (o?.status) setStatus(o.status);
    })();
  }, [orderId]);

  return { status, setStatus };
}
