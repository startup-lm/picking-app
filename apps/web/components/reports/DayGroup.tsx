'use client';

import type { ReportDay } from '@/types/rpc';
import OrderLinesTable from './OrderLinesTable';
import { formatDate, formatDateTime } from '@/utils/date';
import { estadoLabel } from '@/utils/report';
import { useBranding } from '@/components/BrandingProvider';

export default function DayGroupView({ group }: { group: ReportDay }) {
  const { timezone } = useBranding();
  const orders = group.orders || [];

  return (
    <section className="rounded-xl border border-border bg-bg px-4 py-6">
      <h3 className="mb-4 text-base font-semibold">
        {formatDate(group.day, timezone)} — {orders.length} pedido{orders.length === 1 ? '' : 's'}
      </h3>

      <div className="space-y-6">
        {orders.map((o) => {
          const estado = estadoLabel(o.status);
          const preparadoInfo = o.assembled_at
            ? `Preparado: ${formatDateTime(o.assembled_at, timezone)}${o.assembled_by_name ? ` por ${o.assembled_by_name}` : ''}`
            : '';
          const despachoInfo = o.dispatched_at
            ? ` · Despachado: ${formatDateTime(o.dispatched_at, timezone)}`
            : '';

          return (
            <div key={o.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-1 text-sm">
                <div>
                  Pedido <strong>{o.order_number}</strong> — {o.customer} — Estado: <strong>{estado}</strong>
                </div>
                <div className="text-muted">
                  Bultos totales: {o.total_package} — Unidades totales: {o.total_unit}
                </div>
                {(preparadoInfo || despachoInfo) && (
                  <div className="text-xs text-muted">
                    {preparadoInfo}
                    {despachoInfo}
                  </div>
                )}
              </div>

              <OrderLinesTable lines={o.lines} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
