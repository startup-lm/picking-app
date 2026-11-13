'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDate, formatDateTime } from '@/utils/date';
import ConfirmCancelModal from '@/components/orders/ConfirmCancelModal';
import { cancelOrders } from '@/lib/api/orders';
import type { OrderStatus } from '@/types/rpc';

type OrderItem = {
  id: number;
  order_number: string;
  status: OrderStatus;
  priority: 'normal' | 'urgent';
  due_date: string | null;
  created_at: string;
  total_package: number;
  total_unit: number;
  customer: { name: string } | null;
  progress: {
    scanned: number;
    checked: number;
    total: number;
  };
};

const ALL_STATUSES: { key: OrderStatus; label: string }[] = [
  { key: 'draft', label: 'Borrador' },
  { key: 'pending', label: 'Pendiente' },
  { key: 'in_progress', label: 'En preparación' },
  { key: 'assembled', label: 'Preparado' },
  { key: 'dispatched', label: 'Despachado' },
  { key: 'cancelled', label: 'Cancelado' },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-muted/20 text-muted border-border',
  pending: 'bg-accentSoft text-text border-accent',
  in_progress: 'bg-primary text-white border-primary',
  assembled: 'bg-success/20 text-success border-success',
  dispatched: 'bg-success text-white border-success',
  cancelled: 'bg-danger/20 text-danger border-danger',
};

function PedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected statuses
  const initialStatusParam = searchParams.get('status');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<OrderStatus>>(() => {
    if (initialStatusParam) {
      return new Set(initialStatusParam.split(',') as OrderStatus[]);
    }
    return new Set(['draft', 'pending', 'in_progress', 'assembled', 'dispatched']);
  });

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-selection for cancellation
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [cancelModalOrders, setCancelModalOrders] = useState<
    Array<{ id: number; order_number: string; customer: string }>
  >([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  const loadOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (selectedStatuses.size > 0 && selectedStatuses.size < ALL_STATUSES.length) {
        params.set('status', Array.from(selectedStatuses).join(','));
      }
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(page));

      const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar los pedidos');
      const json = await res.json();
      setOrders(json.orders ?? []);
      setHasMore(Boolean(json.hasMore));
      setSelectedIds(new Set());
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatuses, debouncedQ, from, to, page]);

  const toggleStatusChip = (st: OrderStatus) => {
    setPage(0);
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(st)) {
        next.delete(st);
      } else {
        next.add(st);
      }
      return next;
    });
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const cancellable = orders
        .filter((o) => o.status !== 'dispatched' && o.status !== 'cancelled')
        .map((o) => o.id);
      setSelectedIds(new Set(cancellable));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Actions
  const handleSetStatus = async (orderId: number, nextStatus: 'pending' | 'draft') => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? 'No se pudo cambiar el estado');
      }
      await loadOrders();
    } catch (err: any) {
      alert(err?.message ?? 'Error al actualizar el estado');
    } finally {
      setActionBusy(false);
    }
  };

  const openSingleCancel = (order: OrderItem) => {
    setCancelModalOrders([
      {
        id: order.id,
        order_number: order.order_number,
        customer: order.customer?.name ?? 'Sin cliente',
      },
    ]);
    setCancelModalOpen(true);
  };

  const openBatchCancel = () => {
    const toCancel = orders
      .filter((o) => selectedIds.has(o.id))
      .map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer: orderCustomerName(o),
      }));
    setCancelModalOrders(toCancel);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    setActionBusy(true);
    try {
      const ids = cancelModalOrders.map((o) => o.id);
      await cancelOrders(ids, reason);
      setCancelModalOpen(false);
      await loadOrders();
    } catch (err: any) {
      alert(err?.message ?? 'Error al cancelar');
    } finally {
      setActionBusy(false);
    }
  };

  const orderCustomerName = (o: OrderItem) => o.customer?.name ?? 'Sin cliente';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Gestión de Pedidos</h1>
          <p className="text-sm text-muted">Búsqueda, seguimiento y control de pedidos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={openBatchCancel}
              disabled={actionBusy}
              className="rounded-lg border border-danger bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-sm disabled:opacity-60"
            >
              Cancelar seleccionados ({selectedIds.size})
            </button>
          )}
          <Link
            href="/pedidos/nuevo"
            className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-bold text-text hover:opacity-90 shadow-sm"
          >
            + Nuevo pedido
          </Link>
          <Link
            href="/pedidos/importar"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90 shadow-sm"
          >
            Importar pedidos
          </Link>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
        {/* Status Chips */}
        <div>
          <span className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Estados
          </span>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map(({ key, label }) => {
              const active = selectedStatuses.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStatusChip(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? `${STATUS_COLORS[key]} shadow-sm`
                      : 'border-border bg-bg text-muted hover:text-text'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Date Range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">
              Buscar pedido o cliente
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nº de pedido o nombre de cliente…"
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          {errorMsg}
        </div>
      )}

      {/* Orders Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-bg text-xs font-semibold text-muted uppercase">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  checked={
                    orders.length > 0 &&
                    orders.filter((o) => o.status !== 'dispatched' && o.status !== 'cancelled').length > 0 &&
                    orders
                      .filter((o) => o.status !== 'dispatched' && o.status !== 'cancelled')
                      .every((o) => selectedIds.has(o.id))
                  }
                  className="rounded border-border"
                />
              </th>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Entrega</th>
              <th className="px-4 py-3">Avance</th>
              <th className="px-4 py-3">Creado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  Cargando pedidos…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No se encontraron pedidos con los filtros aplicados.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                const canEdit =
                  order.status === 'draft' ||
                  (order.status === 'pending' && order.progress.scanned === 0);
                const canRelease = order.status === 'draft';
                const canRevertToDraft =
                  order.status === 'pending' && order.progress.scanned === 0;
                const canCancel =
                  order.status !== 'dispatched' && order.status !== 'cancelled';

                const pct =
                  order.progress.total > 0
                    ? Math.min(
                        100,
                        Math.round((order.progress.scanned / order.progress.total) * 100)
                      )
                    : 0;

                return (
                  <tr key={order.id} className="hover:bg-bg/40 transition">
                    <td className="px-4 py-3 text-center">
                      {canCancel && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(order.id)}
                          className="rounded border-border"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-text">
                      <Link href={`/pedidos/${order.id}`} className="hover:underline text-primary">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text">{orderCustomerName(order)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[order.status] ?? 'bg-muted/20 text-muted'
                        }`}
                      >
                        {ALL_STATUSES.find((s) => s.key === order.status)?.label ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          order.priority === 'urgent'
                            ? 'bg-danger/20 text-danger border border-danger'
                            : 'bg-muted/20 text-muted'
                        }`}
                      >
                        {order.priority === 'urgent' ? 'Urgente' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text">
                      {order.due_date ? formatDate(order.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-border overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted">
                          {order.progress.scanned}/{order.progress.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/pedidos/${order.id}`}
                          className="rounded border border-border bg-card px-2 py-1 text-xs font-semibold text-text hover:opacity-90"
                        >
                          Ver
                        </Link>
                        {canEdit && (
                          <Link
                            href={`/pedidos/${order.id}/editar`}
                            className="rounded border border-border bg-card px-2 py-1 text-xs font-semibold text-text hover:opacity-90"
                          >
                            Editar
                          </Link>
                        )}
                        {canRelease && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'pending')}
                            disabled={actionBusy}
                            className="rounded border border-accent bg-accentSoft px-2 py-1 text-xs font-semibold text-text hover:opacity-90 disabled:opacity-60"
                          >
                            Liberar
                          </button>
                        )}
                        {canRevertToDraft && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'draft')}
                            disabled={actionBusy}
                            className="rounded border border-border bg-card px-2 py-1 text-xs font-semibold text-muted hover:opacity-90 disabled:opacity-60"
                          >
                            Borrador
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => openSingleCancel(order)}
                            disabled={actionBusy}
                            className="rounded border border-danger/40 bg-card px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        )}
                        <a
                          href={`/api/orders/${order.id}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-border bg-card px-2 py-1 text-xs font-semibold text-text hover:opacity-90"
                        >
                          Imprimir
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-bg/20">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:opacity-90 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-xs text-muted">Página {page + 1}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:opacity-90 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Cancellation */}
      <ConfirmCancelModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        orders={cancelModalOrders}
        busy={actionBusy}
      />
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted">
          Cargando pedidos…
        </div>
      }
    >
      <PedidosContent />
    </Suspense>
  );
}
