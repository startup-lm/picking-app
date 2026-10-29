'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateCsvFile } from '@/lib/validators/file';
import { processOrderCsv } from '@/lib/api/orders';
import { useToast } from '@/hooks/useToast';

type ProcessOk = { file: File; orderId: number; dispatchId: number; client: string; totalPkg: number; totalUnit: number };
type ProcessFail = { file: File; error: string };

export default function CargarPedidoPage() {
  const router = useRouter();
  const { show, ToastViewport } = useToast();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const pickFile = () => inputRef.current?.click();

  const dedupe = (arr: File[]) => {
    const seen = new Set<string>();
    return arr.filter(f => {
      const key = `${f.name}|${f.size}|${f.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (list.length === 0) return;

    const invalids = list.map(validateCsvFile).filter(v => !v.ok);
    if (invalids.length > 0) {
      const msg = invalids.map(v => v.message).join('\n');
      show({ title: 'Archivo inválido', description: msg, variant: 'error' });
    }

    const valids = list.filter((_, i) => validateCsvFile(list[i]).ok);
    setFiles(prev => dedupe([...prev, ...valids]));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setFiles([]);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = '';
  };

  const onUpload = async () => {
    if (files.length === 0) {
      show({ title: 'Faltan archivos', description: 'Seleccioná uno o más .csv primero.', variant: 'error' });
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: files.length });

    const oks: ProcessOk[] = [];
    const fails: ProcessFail[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const res = await processOrderCsv({ file: f });
        oks.push({
          file: f,
          orderId: res.order_id,
          dispatchId: res.dispatch_id,
          client: res.client,
          totalPkg: res.totals.total_package,
          totalUnit: res.totals.total_unit,
        });
      } catch (err: any) {
        fails.push({ file: f, error: err?.message ?? 'Fallo al procesar' });
      } finally {
        setProgress({ done: i + 1, total: files.length });
      }
    }

    // ---- toasts detallados ----
    if (oks.length && !fails.length) {
      if (oks.length === 1) {
        const o = oks[0];
        show({
          title: 'Pedido creado',
          description:
            `Pedido #${o.orderId} · Despacho #${o.dispatchId}\n` +
            `Cliente: ${o.client}\n` +
            `Bultos totales ${o.totalPkg} · Unidades totales ${o.totalUnit}`,
          variant: 'success',
        });
      } else {
        const detail = oks
          .map(o =>
            `Pedido #${o.orderId} · Despacho #${o.dispatchId}\n` +
            `Cliente: ${o.client}\n` +
            `Bultos totales ${o.totalPkg} · Unidades totales ${o.totalUnit}`
          )
          .join('\n\n');
        show({
          title: `Pedidos creados: ${oks.length}`,
          description: detail,
          variant: 'success',
        });
      }
      resetForm();
    } else if (oks.length && fails.length) {
      const okDetail = oks
        .map(o =>
          `Pedido #${o.orderId} · Despacho #${o.dispatchId}\n` +
          `Cliente: ${o.client}\n` +
          `Bultos totales ${o.totalPkg} · Unidades totales ${o.totalUnit}`
        )
        .join('\n\n');
      const failDetail = fails.map(f => `• ${f.file.name}: ${f.error}`).join('\n');

      show({
        title: `Parcial: ${oks.length} OK · ${fails.length} con error`,
        description: `${okDetail}\n\nErrores:\n${failDetail}`,
        variant: 'info',
      });

      // Dejo sólo los que fallaron para reintentar
      setFiles(fails.map(f => f.file));
    } else {
      const failDetail = fails.map(f => `• ${f.file.name}: ${f.error}`).join('\n');
      show({
        title: 'No se pudo procesar ningún archivo',
        description: failDetail || 'Revisá el formato de los CSV',
        variant: 'error',
      });
      // Mantengo todos para que el usuario intente de nuevo o los quite manualmente
    }

    setBusy(false);
  };

  const selectedCount = files.length;
  const progressText = useMemo(() => busy ? `Procesando ${progress.done}/${progress.total}…` : '', [busy, progress]);

  return (
    <div className="mt-10 rounded-xl border border-border bg-bg px-4 py-10 max-w-5xl mx-auto">
      <ToastViewport />

      <div className="relative">
        <button
          onClick={() => router.replace('/home')}
          className="absolute left-0 top-0 text-sm text-muted underline hover:text-text"
        >
          Volver
        </button>
        <h1 className="text-center text-2xl font-bold">Cargar nuevos pedidos</h1>
      </div>

      <div className="mt-10 space-y-6">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={pickFile}
            className="rounded-lg border border-border bg-bgInput px-4 py-2 font-semibold text-text hover:opacity-90"
          >
            Seleccionar archivos CSV
          </button>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-lg border border-border bg-card px-4 py-2 font-semibold text-text hover:opacity-90 disabled:opacity-60"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="mx-auto max-w-2xl">
          {selectedCount === 0 ? (
            <div className="text-center text-sm text-muted">Ningún archivo seleccionado</div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {files.map((f, idx) => (
                <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0 truncate text-sm">{f.name}</div>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    disabled={busy}
                    className="text-xs text-muted underline hover:text-text disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={onUpload}
            className="rounded-lg border border-border bg-yellow px-6 py-2 font-bold text-text disabled:opacity-60"
          >
            {busy ? 'Procesando…' : `Procesar ${selectedCount} pedido${selectedCount > 1 ? 's' : ''}`}
          </button>
          {busy && <div className="text-xs text-muted">{progressText}</div>}
        </div>
      </div>
    </div>
  );
}