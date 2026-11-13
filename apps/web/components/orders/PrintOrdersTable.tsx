'use client';

import { useMemo } from 'react';
import type { OrderSummary } from '@/types/api';
import { estadoLabel } from '@/utils/report';
import { formatDateTime } from '@/utils/date';
import { useBranding } from '@/components/BrandingProvider';

export default function PrintOrdersTable({
  orders,
  onPrint,
}: {
  orders: OrderSummary[];
  onPrint: (id: number) => void;
}) {
  const { timezone } = useBranding();
  const has = useMemo(() => orders.length > 0, [orders.length]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-2 pr-4">Nro Pedido</th>
            <th className="py-2 pr-4">Cliente</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Creado</th>
            <th className="py-2 pr-0 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t border-border">
              <td className="py-2 pr-4 font-medium">{o.order_number}</td>
              <td className="py-2 pr-4">{o.customer || '-'}</td>
              <td className="py-2 pr-4">{estadoLabel(o.status)}</td>
              <td className="py-2 pr-4">{formatDateTime(o.created_at, timezone)}</td>
              <td className="py-2 pr-0 text-right">
                <button
                  onClick={() => onPrint(o.id)}
                  className="rounded-lg border border-border bg-accent px-3 py-1.5 text-xs font-semibold text-text hover:opacity-90"
                >
                  Imprimir pedido
                </button>
              </td>
            </tr>
          ))}
          {!has && (
            <tr>
              <td className="py-6 text-center text-muted" colSpan={5}>
                No hay pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
