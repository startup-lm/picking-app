import { useEffect, useState } from 'react';
import { getDispatchById } from '@/lib/repository/dispatches';
import type { Dispatch } from '@/types/db';

export function useDispatchStatus(dispatchId: string) {
  const [status, setStatus] = useState<Dispatch['status']>('pending');

  useEffect(() => {
    if (!dispatchId) return;
    (async () => {
      const o = await getDispatchById(Number(dispatchId));
      if (o?.status) setStatus(o.status);
    })();
  }, [dispatchId]);

  return { status, setStatus };
}