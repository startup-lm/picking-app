// utils/report.ts
export type EstadoFiltro = 'todos' | 'pendiente' | 'armado' | 'entregado';

export function estadoLabel(
  order_status?: string | null,
  dispatch_status?: string | null
): 'Pendiente' | 'Armado' | 'Entregado' {
  if (dispatch_status === 'delivered') return 'Entregado';
  if (order_status === 'assembled') return 'Armado';
  return 'Pendiente'; // por defecto y para 'pending'
}

export function matchEstadoFiltro(
  filtro: EstadoFiltro,
  order: { order_status?: string | null; dispatch_status?: string | null }
) {
  if (filtro === 'todos') return true;
  const label = estadoLabel(order.order_status, order.dispatch_status);
  if (filtro === 'pendiente') return label === 'Pendiente';
  if (filtro === 'armado')    return label === 'Armado';
  if (filtro === 'entregado') return label === 'Entregado';
  return true;
}
