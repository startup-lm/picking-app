import type { OrderStatus } from '@/types/rpc';

export type EstadoFiltro = 'todos' | 'armado' | 'despachado';

export function estadoLabel(status: OrderStatus | string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'pending':
      return 'Pendiente';
    case 'in_progress':
      return 'En preparación';
    case 'assembled':
      return 'Armado';
    case 'dispatched':
      return 'Despachado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Desconocido';
  }
}

export function matchEstadoFiltro(
  filtro: EstadoFiltro,
  target: OrderStatus | string | null | undefined | { status?: OrderStatus | string | null }
): boolean {
  if (filtro === 'todos') return true;
  const status = typeof target === 'object' && target !== null && 'status' in target
    ? target.status
    : target;
  if (filtro === 'armado') return status === 'assembled';
  if (filtro === 'despachado') return status === 'dispatched';
  return true;
}
