import type { OrderLine, Stage, ScanKind } from '@/types/rpc';

export function progressOf(line: OrderLine, stage: Stage) {
  return stage === 'picking'
    ? {
        pkgDone: line.package_scanned,
        unitDone: line.unit_scanned,
        pkgTotal: line.package_total,
        unitTotal: line.unit_total,
      }
    : {
        pkgDone: line.package_checked,
        unitDone: line.unit_checked,
        pkgTotal: line.package_total,
        unitTotal: line.unit_total,
      };
}

export function isLineComplete(line: OrderLine, stage: Stage): boolean {
  const p = progressOf(line, stage);
  return p.pkgDone >= p.pkgTotal && p.unitDone >= p.unitTotal;
}

export function remaining(line: OrderLine, stage: Stage, kind: ScanKind): number {
  const p = progressOf(line, stage);
  return kind === 'package'
    ? Math.max(0, p.pkgTotal - p.pkgDone)
    : Math.max(0, p.unitTotal - p.unitDone);
}
