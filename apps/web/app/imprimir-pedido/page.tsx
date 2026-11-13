'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { fetchAllOrders } from '@/lib/api/orders';
import { authFetch, readError } from '@/lib/api/http';
import PrintOrdersTable from '@/components/orders/PrintOrdersTable';
import type { OrderSummary } from '@/types/api';

export default function ImprimirPedidoPage() {
  const router = useRouter();
  const { show, ToastViewport } = useToast();

  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<OrderSummary[]>([]);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await fetchAllOrders();
      setRaw(data);
    } catch (err: any) {
      show({
        title: 'Error',
        description: err?.message ?? 'No se pudo cargar la lista',
        variant: 'error',
      });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = term
      ? raw.filter(
          o =>
            (o.customer ?? '').toLowerCase().includes(term) ||
            (o.order_number ?? '').toLowerCase().includes(term)
        )
      : raw;
    list = [...list].sort((a, b) => {
      const da = Date.parse(a.created_at);
      const db = Date.parse(b.created_at);
      return sort === 'asc' ? da - db : db - da;
    });
    return list;
  }, [raw, q, sort]);

  const onPrint = async (orderId: number) => {
    try {
      const res = await authFetch(`/api/orders/${orderId}/print`);
      if (!res.ok) {
        const errorMsg = await readError(res);
        show({
          title: 'Error al imprimir',
          description: errorMsg,
          variant: 'error',
        });
        return;
      }
      const text = await res.text();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
      window.open(url, '_blank');
    } catch (err: any) {
      show({
        title: 'Error al imprimir',
        description: err?.message ?? 'No se pudo generar la vista de impresión',
        variant: 'error',
      });
    }
  };

  const infoText = useMemo(() => {
    const total = raw.length;
    const vis = filtered.length;
    return `${vis}/${total} pedido${vis === 1 ? '' : 's'}`;
  }, [raw.length, filtered.length]);

  return (
    <div className="mt-10 rounded-xl border border-border bg-bg px-4 py-10 max-w-5xl mx-auto">
      <ToastViewport />

      <div className="relative mb-6">
        <button
          onClick={() => router.replace('/home')}
          className="absolute left-0 top-0 text-sm text-muted underline hover:text-text"
        >
          Volver
        </button>
        <h1 className="text-center text-2xl font-bold">Imprimir pedido</h1>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted">Buscar por cliente o nro pedido</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: ACME o PED-0001"
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none"
          />
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-sm text-muted">Ordenar por fecha</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
              className="rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none"
            >
              <option value="desc">Descendente (más reciente primero)</option>
              <option value="asc">Ascendente (más antiguo primero)</option>
            </select>
          </div>

          <button
            onClick={() => load()}
            disabled={loading}
            className="h-10 self-end rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="mb-2 text-sm text-muted">{loading ? 'Cargando…' : infoText}</div>

      <div className="rounded-lg border border-border bg-card p-4">
        {loading ? (
          <div className="text-sm text-muted">Cargando lista…</div>
        ) : (
          <PrintOrdersTable orders={filtered} onPrint={onPrint} />
        )}
      </div>
    </div>
  );
}
