'use client';

import { useMemo } from 'react';
import type { OrderSummary } from '@/types/api';
import { estadoLabel } from '@/utils/report';
import { formatDateTime } from '@/utils/date';

export default function PendingOrdersTable(props: {
  orders: OrderSummary[];
  selectedIds: Set<number>;
  onToggleOne: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  const { orders, selectedIds, onToggleAll, onToggleOne } = props;

  const allChecked = useMemo(
    () => orders.length > 0 && orders.every(o => selectedIds.has(o.id)),
    [orders, selectedIds]
  );
  const someChecked = useMemo(
    () => orders.some(o => selectedIds.has(o.id)) && !allChecked,
    [orders, selectedIds, allChecked]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-2 pr-4">
              <input
                type="checkbox"
                aria-label="Seleccionar todos"
                checked={allChecked}
                ref={el => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <th className="py-2 pr-4">Nro Pedido</th>
            <th className="py-2 pr-4">Cliente</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Creado</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t border-border">
              <td className="py-2 pr-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(o.id)}
                  onChange={() => onToggleOne(o.id)}
                  aria-label={`Seleccionar pedido ${o.order_number}`}
                />
              </td>
              <td className="py-2 pr-4 font-medium">{o.order_number}</td>
              <td className="py-2 pr-4">{o.customer || '-'}</td>
              <td className="py-2 pr-4">{estadoLabel(o.status)}</td>
              <td className="py-2 pr-4">{formatDateTime(o.created_at)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td className="py-6 text-center text-muted" colSpan={5}>
                No hay pedidos pendientes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
