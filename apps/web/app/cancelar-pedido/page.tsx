'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PendingOrdersTable from '@/components/orders/PendingOrdersTable';
import { cancelOrders, fetchPendingOrders } from '@/lib/api/orders';
import { useToast } from '@/hooks/useToast';
import { PendingOrder } from '@/types/api';
import ConfirmCancelModal from '@/components/orders/ConfirmCancelModal';
import CancelResultModal from '@/components/orders/CancelResultModal';

export default function CancelarPedidoPage() {
  const router = useRouter();
  const { show, ToastViewport } = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [raw, setRaw] = useState<PendingOrder[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  // Modales
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const [resultIds, setResultIds] = useState<number[]>([]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await fetchPendingOrders(); // no-store + cache buster
      setRaw(data);
      setSelected(new Set());
    } catch (err: any) {
      show({ title: 'Error', description: err?.message ?? 'No se pudo cargar la lista', variant: 'error' });
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
    let list = term ? raw.filter(o => (o.client ?? '').toLowerCase().includes(term)) : raw;
    list = [...list].sort((a, b) => {
      const da = Date.parse(a.created_at);
      const db = Date.parse(b.created_at);
      return sort === 'asc' ? da - db : db - da;
    });
    return list;
  }, [raw, q, sort]);

  // Órdenes seleccionadas con id + cliente (para el modal)
  const selectedOrders = useMemo(
    () => filtered.filter(o => selected.has(o.id)),
    [filtered, selected]
  );

  const onToggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onToggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map(o => o.id)));
    else setSelected(new Set());
  };

  const selectedCount = selected.size;
  const canCancel = selectedCount > 0 && !busy;

  const askCancel = () => {
    if (!selectedCount) return;
    setOpenConfirm(true);
  };

  const confirmCancel = async () => {
    const ids = selectedOrders.map(o => o.id);
    if (!ids.length) return;

    setBusy(true);
    try {
      const res = await cancelOrders(ids);
      setOpenConfirm(false);
      setResultIds(res.deleted_ids);
      setOpenResult(true);
      await load({ silent: true }); // refresca lista desde server
    } catch (err: any) {
      setOpenConfirm(false);
      show({ title: 'Error al cancelar', description: err?.message ?? 'Intentalo de nuevo', variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const infoText = useMemo(() => {
    const total = raw.length;
    const vis = filtered.length;
    return `${vis}/${total} pendiente${vis === 1 ? '' : 's'}${selectedCount ? ` · ${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}` : ''}`;
  }, [raw.length, filtered.length, selectedCount]);

  return (
    <div className="mt-10 rounded-xl border border-border bg-bg px-4 py-10 max-w-5xl mx-auto">
      <ToastViewport />

      {/* Modales */}
      <ConfirmCancelModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmCancel}
        orders={selectedOrders.map(o => ({ id: o.id, client: o.client ?? null }))}
        busy={busy}
      />
      <CancelResultModal
        open={openResult}
        onClose={() => setOpenResult(false)}
        deletedCount={resultIds.length}
      />

      <div className="relative mb-6">
        <button
          onClick={() => router.replace('/home')}
          className="absolute left-0 top-0 text-sm text-muted underline hover:text-text"
        >
          Volver
        </button>
        <h1 className="text-center text-2xl font-bold">Cancelar pedido</h1>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted">Buscar por cliente</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: ACME"
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
            disabled={loading || busy}
            className="h-10 self-end rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* Acciones / Info */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted">{loading ? 'Cargando…' : infoText}</div>
        <div className="flex gap-2">
          <button
            onClick={askCancel}
            disabled={!canCancel}
            className="rounded-lg border border-border bg-red px-4 py-2 text-sm font-semibold text-text hover:opacity-90 disabled:opacity-60"
          >
            Cancelar seleccionados
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {loading ? (
          <div className="text-sm text-muted">Cargando lista…</div>
        ) : (
          <PendingOrdersTable
            orders={filtered}
            selectedIds={selected}
            onToggleOne={onToggleOne}
            onToggleAll={onToggleAll}
          />
        )}
      </div>
    </div>
  );
}
