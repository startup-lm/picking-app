'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DayGroupView from '@/components/reports/DayGroup';
import type { ReportDay } from '@/types/rpc';
import { fetchOrdersByDate, downloadOrdersCsv } from '@/lib/api/reports';
import Modal from '@/components/ui/Modal';
import { type EstadoFiltro, matchEstadoFiltro } from '@/utils/report';

export default function GenerarReportePage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [groups, setGroups] = useState<ReportDay[] | null>(null);

  const [modal, setModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const openModal = (title: string, message: string) => setModal({ open: true, title, message });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  // Filtro por estado (client-side)
  const [estado, setEstado] = useState<EstadoFiltro>('todos');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) {
      const msg =
        !from && !to
          ? 'Elegí fecha inicio y fin.'
          : !from
          ? 'Elegí fecha de inicio.'
          : 'Elegí fecha de fin.';
      openModal('Datos incompletos', msg);
      return;
    }
    setBusy(true);
    try {
      const data = await fetchOrdersByDate(from, to);
      setGroups(data);
    } catch (err: any) {
      openModal('Error al generar el reporte', err?.message ?? 'No se pudo generar el reporte');
      setGroups(null);
    } finally {
      setBusy(false);
    }
  };

  const onExportCsv = async () => {
    if (!from || !to) return;
    setExporting(true);
    try {
      await downloadOrdersCsv(from, to);
    } catch (err: any) {
      openModal('Error al exportar CSV', err?.message ?? 'No se pudo descargar el archivo CSV');
    } finally {
      setExporting(false);
    }
  };

  // Aplico filtro en memoria
  const filteredGroups: ReportDay[] | null = useMemo(() => {
    if (!groups) return null;
    return groups
      .map(g => ({
        day: g.day,
        orders: (g.orders ?? []).filter(o => matchEstadoFiltro(estado, o.status)),
      }))
      .filter(g => (g.orders?.length ?? 0) > 0);
  }, [groups, estado]);

  return (
    <div className="mt-10 rounded-xl border border-border bg-bg px-4 py-10 max-w-5xl mx-auto">
      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={modal.title}
        footer={
          <div className="w-full flex justify-center">
            <button
              onClick={closeModal}
              className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-semibold text-text"
            >
              Aceptar
            </button>
          </div>
        }
      >
        <p className="text-sm text-center whitespace-pre-line">{modal.message}</p>
      </Modal>

      <div className="relative">
        <button
          onClick={() => router.replace('/home')}
          className="absolute left-0 top-0 text-sm text-muted underline hover:text-text"
        >
          Volver
        </button>
        <h1 className="text-center text-2xl font-bold">Generar reporte</h1>
      </div>

      <form onSubmit={onSubmit} className="mt-10 space-y-6 max-w-lg mx-auto text-center">
        {/* Rango de fechas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 justify-items-center">
          <div className="w-full">
            <label className="mb-1 block text-sm text-muted text-center">Fecha inicio</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none"
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-sm text-muted text-center">Fecha fin</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-border bg-accent px-6 py-2 font-bold text-text disabled:opacity-60"
          >
            {busy ? 'Generando…' : 'Generar'}
          </button>

          {groups && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={exporting}
              className="rounded-lg border border-border bg-card px-6 py-2 font-semibold text-text hover:opacity-90 disabled:opacity-60"
            >
              {exporting ? 'Descargando…' : 'Exportar CSV'}
            </button>
          )}
        </div>
      </form>

      {/* Filtro de estado */}
      {groups && (
        <div className="mt-5 w-full flex justify-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoFiltro)}
              className="rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none"
            >
              <option value="todos">Todos</option>
              <option value="armado">Armado</option>
              <option value="despachado">Despachado</option>
            </select>
          </div>
        </div>
      )}

      {filteredGroups && (
        <div className="mt-10 space-y-8">
          {filteredGroups.map((g) => (
            <DayGroupView key={g.day} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
