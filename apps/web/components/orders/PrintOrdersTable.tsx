'use client';

import { useMemo } from 'react';

type Row = {
  id: number;
  client: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}

export default function PrintOrdersTable({
  orders,
  onPrint,
}: {
  orders: Row[];
  onPrint: (id: number) => void;
}) {
  const has = useMemo(() => orders.length > 0, [orders.length]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Cliente</th>
            <th className="py-2 pr-4">Creado</th>
            <th className="py-2 pr-0 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t border-border">
              <td className="py-2 pr-4 font-medium">#{o.id}</td>
              <td className="py-2 pr-4">{o.client || '-'}</td>
              <td className="py-2 pr-4">{formatDateTime(o.created_at)}</td>
              <td className="py-2 pr-0 text-right">
                <button
                  onClick={() => onPrint(o.id)}
                  className="rounded-lg border border-border bg-yellow px-3 py-1.5 text-xs font-semibold text-text hover:opacity-90"
                >
                  Imprimir pedido
                </button>
              </td>
            </tr>
          ))}
          {!has && (
            <tr>
              <td className="py-6 text-center text-muted" colSpan={4}>
                No hay pedidos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
