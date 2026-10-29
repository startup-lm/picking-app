'use client';

import { PendingOrder } from '@/types/api';
import { useMemo } from 'react';


function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}

export default function PendingOrdersTable(props: {
  orders: PendingOrder[];
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
                ref={el => { if (el) el.indeterminate = someChecked; }}
                onChange={(e) => onToggleAll(e.target.checked)}
              />
            </th>
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Cliente</th>
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
                  aria-label={`Seleccionar pedido ${o.id}`}
                />
              </td>
              <td className="py-2 pr-4 font-medium">#{o.id}</td>
              <td className="py-2 pr-4">{o.client || '-'}</td>
              <td className="py-2 pr-4">{formatDateTime(o.created_at)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td className="py-6 text-center text-muted" colSpan={4}>No hay pedidos pendientes.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
