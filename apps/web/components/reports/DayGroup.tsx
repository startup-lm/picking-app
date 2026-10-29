'use client';

import { DayGroup } from '@/types/api';
import OrderLinesTable from './OrderLinesTable';
import { formatDate, formatDateTime } from '@/utils/date';
import { estadoLabel } from '@/utils/report';

export default function DayGroupView({ group }: { group: DayGroup }) {
  const orders = group.orders || [];

  return (
    <section className="rounded-xl border border-border bg-bg px-4 py-6">
      <h3 className="mb-4 text-base font-semibold">
        {formatDate(group.day)} — {orders.length} pedido{orders.length === 1 ? '' : 's'}
      </h3>

      <div className="space-y-6">
        {orders.map((o) => {
          const estado = estadoLabel(o.order_status, o.dispatch_status);
          return (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-1">
                <div>
                  Pedido #{o.id} — {o.client} — Estado: <strong>{estado}</strong>
                </div>
                <div>
                  Bultos totales: {o.total_package} — Unidades totales: {o.total_unit}
                </div>
                <div>
                  Última actualización: {formatDateTime(o.updated_at)}
                </div>
              </div>

              <OrderLinesTable lines={o.lines} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
