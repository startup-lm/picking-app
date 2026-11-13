import type { OrderLine, Stage } from '@/types/rpc';
import { isLineComplete } from './progress';

export type Statuses = 'all' | 'pending' | 'complete';

export function filterByStatus<T extends OrderLine>(rows: T[], status: Statuses, stage: Stage): T[] {
  if (status === 'all') return rows;
  const pred = status === 'pending'
    ? (r: T) => !isLineComplete(r, stage)
    : (r: T) => isLineComplete(r, stage);
  return rows.filter(pred);
}
