'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate, formatDateTime } from '@/utils/date';
import { useBranding } from '@/components/BrandingProvider';
import ConfirmCancelModal from '@/components/orders/ConfirmCancelModal';
import { cancelOrders } from '@/lib/api/orders';
import type { OrderStatus } from '@/types/rpc';

type OrderDetail = {
  id: number;
  order_number: string;
  status: OrderStatus;
  priority: 'normal' | 'urgent';
  due_date: string | null;
  notes: string | null;
  created_at: string;
  started_at: string | null;
  assembled_at: string | null;
  dispatched_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  total_package: number;
  total_unit: number;
  created_by_name: string | null;
  started_by_name: string | null;
  assembled_by_name: string | null;
  dispatched_by_name: string | null;
  cancelled_by_name: string | null;
  customer: {
    id: number;
    name: string;
    code?: string | null;
    address?: string | null;
  } | null;
  lines: Array<{
    id: number;
    location: string | null;
    package_total: number;
    unit_total: number;
    package_scanned: number;
    unit_scanned: number;
    package_checked: number;
    unit_checked: number;
    product: {
      id: number;
      sku: string;
      description: string;
      units_per_package: number;
    } | null;
  }>;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  in_progress: 'En preparación',
  assembled: 'Preparado',
  dispatched: 'Despachado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-muted/20 text-muted border-border',
  pending: 'bg-accentSoft text-text border-accent',
  in_progress: 'bg-primary text-white border-primary',
  assembled: 'bg-success/20 text-success border-success',
  dispatched: 'bg-success text-white border-success',
  cancelled: 'bg-danger/20 text-danger border-danger',
};

export default function PedidoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { timezone } = useBranding();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Cancellation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${params.id}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Pedido no encontrado');
        throw new Error('Error al cargar el pedido');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Error al cargar pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleSetStatus = async (nextStatus: 'pending' | 'draft') => {
    if (actionBusy || !order) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? 'No se pudo cambiar el estado');
      }
      await loadOrder();
    } catch (err: any) {
      alert(err?.message ?? 'Error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!order) return;
    setActionBusy(true);
    try {
      await cancelOrders([order.id], reason);
      setCancelModalOpen(false);
      await loadOrder();
    } catch (err: any) {
      alert(err?.message ?? 'Error al cancelar');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted">
        Cargando detalle del pedido…
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-danger font-semibold mb-4">{errorMsg ?? 'Pedido no encontrado'}</p>
        <Link
          href="/pedidos"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
        >
          Volver a pedidos
        </Link>
      </div>
    );
  }

  const scannedCount = order.lines.reduce(
    (acc, l) => acc + (l.package_scanned ?? 0) + (l.unit_scanned ?? 0),
    0
  );
  const totalCount = (order.total_package ?? 0) + (order.total_unit ?? 0);
  const isAssembledOrDispatched = order.status === 'assembled' || order.status === 'dispatched';

  const canEdit =
    order.status === 'draft' || (order.status === 'pending' && scannedCount === 0);
  const canRelease = order.status === 'draft';
  const canRevertToDraft = order.status === 'pending' && scannedCount === 0;
  const canCancel = order.status !== 'dispatched' && order.status !== 'cancelled';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/pedidos"
          className="text-sm font-semibold text-muted hover:text-text flex items-center gap-1"
        >
          ← Volver a pedidos
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link
              href={`/pedidos/${order.id}/editar`}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-text hover:opacity-90 shadow-sm"
            >
              Editar pedido
            </Link>
          )}
          {canRelease && (
            <button
              onClick={() => handleSetStatus('pending')}
              disabled={actionBusy}
              className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-bold text-text hover:opacity-90 shadow-sm disabled:opacity-60"
            >
              Liberar a depósito
            </button>
          )}
          {canRevertToDraft && (
            <button
              onClick={() => handleSetStatus('draft')}
              disabled={actionBusy}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted hover:opacity-90 disabled:opacity-60"
            >
              Volver a borrador
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setCancelModalOpen(true)}
              disabled={actionBusy}
              className="rounded-lg border border-danger/40 bg-card px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/10 shadow-sm disabled:opacity-60"
            >
              Cancelar pedido
            </button>
          )}
          <a
            href={`/api/orders/${order.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-text hover:opacity-90 shadow-sm"
          >
            Imprimir remito
          </a>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">{order.order_number}</h1>
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${
                  STATUS_COLORS[order.status] ?? 'bg-muted/20 text-muted'
                }`}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  order.priority === 'urgent'
                    ? 'bg-danger/20 text-danger border border-danger'
                    : 'bg-muted/20 text-muted'
                }`}
              >
                {order.priority === 'urgent' ? 'Urgente' : 'Normal'}
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-text">
              {order.customer?.name ?? 'Sin cliente asignado'}
              {order.customer?.code ? ` (${order.customer.code})` : ''}
            </p>
            {order.customer?.address && (
              <p className="text-xs text-muted mt-0.5">{order.customer.address}</p>
            )}
          </div>

          <div className="text-right sm:text-right">
            <span className="block text-xs text-muted uppercase">Fecha de entrega</span>
            <span className="text-sm font-semibold text-text">
              {order.due_date ? formatDate(order.due_date, timezone) : 'No definida'}
            </span>
          </div>
        </div>

        {order.notes && (
          <div className="mt-4 rounded-lg bg-bg p-3 border border-border">
            <span className="block text-xs font-semibold text-muted uppercase mb-1">Notas</span>
            <p className="text-sm text-text whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Operational Timeline / Events */}
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted block">Creado</span>
            <span className="font-semibold text-text">{formatDateTime(order.created_at, timezone)}</span>
            {order.created_by_name && (
              <span className="text-muted block">por {order.created_by_name}</span>
            )}
          </div>

          {order.started_at && (
            <div>
              <span className="text-muted block">Preparación iniciada</span>
              <span className="font-semibold text-text">{formatDateTime(order.started_at, timezone)}</span>
              {order.started_by_name && (
                <span className="text-muted block">por {order.started_by_name}</span>
              )}
            </div>
          )}

          {order.assembled_at && (
            <div>
              <span className="text-muted block">Preparado</span>
              <span className="font-semibold text-text">{formatDateTime(order.assembled_at, timezone)}</span>
              {order.assembled_by_name && (
                <span className="text-muted block">por {order.assembled_by_name}</span>
              )}
            </div>
          )}

          {order.dispatched_at && (
            <div>
              <span className="text-muted block">Despachado</span>
              <span className="font-semibold text-text">{formatDateTime(order.dispatched_at, timezone)}</span>
              {order.dispatched_by_name && (
                <span className="text-muted block">por {order.dispatched_by_name}</span>
              )}
            </div>
          )}

          {order.cancelled_at && (
            <div className="col-span-full rounded-lg bg-danger/10 border border-danger/30 p-3">
              <span className="text-danger font-semibold block">
                Cancelado el {formatDateTime(order.cancelled_at, timezone)}
                {order.cancelled_by_name ? ` por ${order.cancelled_by_name}` : ''}
              </span>
              {order.cancel_reason && (
                <span className="text-text text-xs mt-1 block">
                  <strong>Motivo:</strong> {order.cancel_reason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Lines Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-bg/50 flex items-center justify-between">
          <h2 className="text-base font-bold text-text">
            Artículos del pedido ({order.lines.length})
          </h2>
          <span className="text-sm text-muted">
            Total bultos: <strong>{order.total_package}</strong> · Total unidades:{' '}
            <strong>{order.total_unit}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-xs font-semibold text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-right">Bultos</th>
                <th className="px-4 py-3 text-right">Unidades</th>
                {isAssembledOrDispatched && (
                  <>
                    <th className="px-4 py-3 text-right">Bultos chequeados</th>
                    <th className="px-4 py-3 text-right">Unid. chequeadas</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.lines.map((li) => (
                <tr key={li.id} className="hover:bg-bg/30 transition">
                  <td className="px-4 py-3 font-semibold text-text">
                    {li.location || '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary">
                    {li.product?.sku ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-text">
                    {li.product?.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-text">
                      {li.package_scanned} / {li.package_total}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-text">
                      {li.unit_scanned} / {li.unit_total}
                    </span>
                  </td>
                  {isAssembledOrDispatched && (
                    <>
                      <td className="px-4 py-3 text-right text-success font-semibold">
                        {li.package_checked} / {li.package_total}
                      </td>
                      <td className="px-4 py-3 text-right text-success font-semibold">
                        {li.unit_checked} / {li.unit_total}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmCancelModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        orders={[
          {
            id: order.id,
            order_number: order.order_number,
            customer: order.customer?.name ?? 'Sin cliente',
          },
        ]}
        busy={actionBusy}
      />
    </div>
  );
}
