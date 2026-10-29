// utils/completion.ts
export type Statuses = 'all' | 'pending' | 'complete';

export type ScanLike = {
  package_total: number;
  unit_total: number;
  package_scanned: number;
  unit_scanned: number;
};

export function isComplete<T extends ScanLike>(r: T): boolean {
  return Number(r.package_scanned) >= Number(r.package_total) &&
         Number(r.unit_scanned)  >= Number(r.unit_total);
}

export function filterByStatus<T extends ScanLike>(rows: T[], status: Statuses): T[] {
  if (status === 'all') return rows;
  const pred = status === 'pending' ? (r: T) => !isComplete(r) : (r: T) => isComplete(r);
  return rows.filter(pred);
}
