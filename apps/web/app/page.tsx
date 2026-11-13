'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/date';
import { useBranding } from '@/components/BrandingProvider';
import type { OrderStatus } from '@/types/rpc';

type DashboardData = {
  counts: {
    draft: number;
    pending: number;
    in_progress: number;
    assembled: number;
    dispatched: number;
    cancelled: number;
  };
  urgent: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    status: OrderStatus;
    due_date: string | null;
    created_at: string;
    progress: { scanned: number; total: number };
  }>;
  today: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const { timezone } = useBranding();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('No se pudo cargar el panel');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Panel del día</h1>
          <p className="text-sm text-muted">Resumen operativo y pedidos en curso</p>
        </div>

        <div className="flex flex-wrap gap-2">
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
          <Link
            href="/productos/importar"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90 shadow-sm"
          >
            Importar productos
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-danger bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="mt-12 text-center text-muted">Cargando panel…</div>
      ) : data ? (
        <>
          {/* Status Count Cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <button
              onClick={() => router.push('/pedidos?status=draft')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">Borradores</span>
              <span className="mt-1 text-2xl font-bold text-text">{data.counts.draft}</span>
            </button>

            <button
              onClick={() => router.push('/pedidos?status=pending')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">Pendientes</span>
              <span className="mt-1 text-2xl font-bold text-accent">{data.counts.pending}</span>
            </button>

            <button
              onClick={() => router.push('/pedidos?status=in_progress')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">En preparación</span>
              <span className="mt-1 text-2xl font-bold text-primary">{data.counts.in_progress}</span>
            </button>

            <button
              onClick={() => router.push('/pedidos?status=assembled')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">Preparados</span>
              <span className="mt-1 text-2xl font-bold text-success">{data.counts.assembled}</span>
            </button>

            <button
              onClick={() => router.push('/pedidos?status=dispatched')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">Despachados hoy</span>
              <span className="mt-1 text-2xl font-bold text-text">{data.counts.dispatched}</span>
            </button>

            <button
              onClick={() => router.push('/pedidos?status=cancelled')}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:shadow-md"
            >
              <span className="text-xs font-semibold text-muted">Cancelados hoy</span>
              <span className="mt-1 text-2xl font-bold text-danger">{data.counts.cancelled}</span>
            </button>
          </div>

          {/* Urgent Orders Section */}
          <div className="mt-10">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold text-text">Pedidos urgentes activos</h2>
              <Link href="/pedidos" className="text-sm font-semibold text-primary underline">
                Ver todos los pedidos
              </Link>
            </div>

            {data.urgent.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
                No hay pedidos urgentes activos en este momento.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-bg text-xs font-semibold text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha entrega</th>
                      <th className="px-4 py-3">Avance</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.urgent.map((order) => {
                      const pct = order.progress.total > 0
                        ? Math.min(100, Math.round((order.progress.scanned / order.progress.total) * 100))
                        : 0;

                      return (
                        <tr key={order.id} className="hover:bg-bg/50 transition">
                          <td className="px-4 py-3 font-bold text-text">
                            <Link href={`/pedidos/${order.id}`} className="hover:underline text-primary">
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-text">{order.customer_name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                STATUS_COLORS[order.status] ?? 'bg-muted/20 text-muted'
                              }`}
                            >
                              {STATUS_LABELS[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text">
                            {order.due_date ? formatDate(order.due_date, timezone) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 rounded-full bg-border overflow-hidden">
                                <div
                                  className="h-full bg-accent"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted">
                                {order.progress.scanned}/{order.progress.total}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/pedidos/${order.id}`}
                              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text hover:opacity-90"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
