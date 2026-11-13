'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';
import type { ImportOrdersResult, ImportError } from '@/types/rpc';

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  missing_order_number: 'Falta el número de pedido',
  order_exists: 'El pedido ya fue cargado',
  missing_customer: 'Falta el cliente',
  unknown_sku: 'SKU inexistente',
  inactive_sku: 'SKU inactivo',
  invalid_quantity: 'Cantidad inválida',
  missing_quantity: 'Falta la cantidad',
  invalid_date: 'Fecha inválida',
  invalid_priority: 'Prioridad inválida',
};

const WARNING_MESSAGES: Record<string, string> = {
  duplicate_sku_merged: 'SKU repetido: se sumaron las cantidades',
};

function translateErrorCode(code: string): string {
  return ORDER_ERROR_MESSAGES[code] || code;
}

function translateWarningCode(code: string): string {
  return WARNING_MESSAGES[code] || code;
}

type ImportResponse = {
  result: ImportOrdersResult;
  ignoredColumns: string[];
  totalRows: number;
};

export default function ImportarPedidosPage() {
  const { show, ToastViewport } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [release, setRelease] = useState(false);
  const [step, setStep] = useState<'select' | 'preview' | 'completed'>('select');

  const [previewData, setPreviewData] = useState<ImportResponse | null>(null);
  const [completedData, setCompletedData] = useState<ImportResponse | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralError(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setGeneralError('Seleccioná un archivo para continuar');
      return;
    }

    setGeneralError(null);
    setLoadingPreview(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch(
        `/api/import/orders?dry_run=1&release=${release ? 1 : 0}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        const errMessage = await readError(res);
        setGeneralError(errMessage);
        return;
      }

      const data: ImportResponse = await res.json();
      setPreviewData(data);
      setStep('preview');
    } catch {
      setGeneralError('Error de conexión al procesar el archivo');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;

    setGeneralError(null);
    setLoadingConfirm(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch(
        `/api/import/orders?dry_run=0&release=${release ? 1 : 0}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        const errMessage = await readError(res);
        setGeneralError(errMessage);
        return;
      }

      const data: ImportResponse = await res.json();
      setCompletedData(data);
      setStep('completed');
      show({
        title: 'Importación exitosa',
        description: `Se crearon ${data.result.orders_created} pedidos y ${data.result.lines_created} líneas`,
        variant: 'success',
      });
    } catch {
      setGeneralError('Error de conexión al confirmar la importación');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const downloadErrorCsv = () => {
    if (!previewData || previewData.result.errors.length === 0) return;

    const headers = ['fila', 'pedido', 'sku', 'error'];
    const rows = previewData.result.errors.map((err) => [
      err.row,
      `"${(err.order_number || '').replace(/"/g, '""')}"`,
      `"${(err.sku || '').replace(/"/g, '""')}"`,
      `"${translateErrorCode(err.code).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'errores-importacion-pedidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ToastViewport />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Importar pedidos</h1>
          <p className="text-sm text-muted">
            Carga masiva de pedidos por archivo Excel o CSV
          </p>
        </div>
        <Link
          href="/pedidos"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
        >
          Volver a pedidos
        </Link>
      </div>

      {generalError && (
        <div className="mb-6 rounded-lg border border-danger bg-danger/10 p-4 text-sm font-semibold text-danger">
          {generalError}
        </div>
      )}

      {/* Step 1: File selection & Options */}
      {step === 'select' && (
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-text">1. Descargar plantilla oficial</h2>
            <p className="mt-1 text-sm text-muted">
              Descargá una plantilla con los encabezados esperados y filas de ejemplo para
              completar tus pedidos.
            </p>
            <div className="mt-3 flex gap-3">
              <a
                href="/api/import/template?kind=orders&format=xlsx"
                download
                className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text hover:bg-bg/80"
              >
                Descargar plantilla Excel (.xlsx)
              </a>
              <a
                href="/api/import/template?kind=orders&format=csv"
                download
                className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text hover:bg-bg/80"
              >
                Descargar plantilla CSV (.csv)
              </a>
            </div>
          </div>

          <hr className="border-border" />

          {/* Release Option Radios */}
          <div>
            <h2 className="text-base font-bold text-text">2. Destino operativo</h2>
            <p className="mt-1 text-sm text-muted">
              Elegí cómo se darán de alta los pedidos creados:
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input
                  type="radio"
                  name="release_option"
                  checked={!release}
                  onChange={() => setRelease(false)}
                  className="rounded border-border text-primary"
                />
                <span className="font-semibold">Importar como borrador</span>
                <span className="text-xs text-muted">(se liberan manualmente más tarde)</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input
                  type="radio"
                  name="release_option"
                  checked={release}
                  onChange={() => setRelease(true)}
                  className="rounded border-border text-primary"
                />
                <span className="font-semibold">Liberar directamente a depósito</span>
                <span className="text-xs text-muted">(disponibles para escaneo inmediato)</span>
              </label>
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <h2 className="text-base font-bold text-text">3. Seleccionar archivo de pedidos</h2>
            <p className="mt-1 text-sm text-muted">
              Formatos soportados: .xlsx, .xls, .csv, .txt (hasta 5 MB y 5000 filas).
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={handleFileChange}
                className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || loadingPreview}
                className="rounded-lg border border-border bg-accent px-6 py-2 text-sm font-bold text-text hover:opacity-90 disabled:opacity-50"
              >
                {loadingPreview ? 'Analizando archivo…' : 'Previsualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview Results */}
      {step === 'preview' && previewData && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text">Resumen de vista previa</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-center">
              <div className="rounded-lg bg-bg p-4 flex-1 border border-border">
                <span className="text-2xl font-bold text-success">
                  {previewData.result.orders_created}
                </span>
                <span className="block text-xs font-semibold text-muted uppercase mt-1">
                  Pedidos válidos
                </span>
              </div>
              <div className="rounded-lg bg-bg p-4 flex-1 border border-border">
                <span className="text-2xl font-bold text-primary">
                  {previewData.result.lines_created}
                </span>
                <span className="block text-xs font-semibold text-muted uppercase mt-1">
                  Líneas a crear
                </span>
              </div>
              <div className="rounded-lg bg-bg p-4 flex-1 border border-border">
                <span
                  className={`text-2xl font-bold ${
                    previewData.result.errors.length > 0 ? 'text-danger' : 'text-text'
                  }`}
                >
                  {previewData.result.errors.length}
                </span>
                <span className="block text-xs font-semibold text-muted uppercase mt-1">
                  Errores encontrados
                </span>
              </div>
            </div>

            {previewData.ignoredColumns.length > 0 && (
              <div className="mt-4 rounded-lg bg-bg p-3 text-xs text-muted border border-border">
                <span className="font-semibold text-text">Columnas ignoradas:</span>{' '}
                {previewData.ignoredColumns.join(', ')}
              </div>
            )}
          </div>

          {/* Warnings Table */}
          {previewData.result.warnings && previewData.result.warnings.length > 0 && (
            <div className="rounded-xl border border-accent bg-accentSoft/30 p-6 shadow-sm">
              <h3 className="font-bold text-text text-base mb-2">Avisos automáticos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/40 text-xs font-semibold text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Pedido</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Aviso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {previewData.result.warnings.map((warn, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-xs">{warn.row}</td>
                        <td className="px-3 py-1.5 font-bold text-text">
                          {warn.order_number ?? '—'}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-xs">{warn.sku ?? '—'}</td>
                        <td className="px-3 py-1.5 text-xs text-text">
                          {translateWarningCode(warn.code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors Table */}
          {previewData.result.errors.length > 0 && (
            <div className="rounded-xl border border-danger/40 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-danger text-base">
                  Errores que impiden la carga ({previewData.result.errors.length})
                </h3>
                <button
                  type="button"
                  onClick={downloadErrorCsv}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:opacity-90"
                >
                  Descargar filas con error (.csv)
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-bg border-b border-border text-xs font-semibold text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Pedido</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {previewData.result.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-bg/40">
                        <td className="px-3 py-2 text-xs font-semibold">{err.row}</td>
                        <td className="px-3 py-2 font-bold text-text">
                          {err.order_number || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{err.sku || '—'}</td>
                        <td className="px-3 py-2 text-danger font-medium text-xs">
                          {translateErrorCode(err.code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Orders Preview Table */}
          {previewData.result.orders && previewData.result.orders.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-text text-base mb-3">
                Pedidos que se crearán ({previewData.result.orders.length})
              </h3>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-bg border-b border-border text-xs font-semibold text-muted uppercase">
                    <tr>
                      <th className="px-4 py-2">Número de pedido</th>
                      <th className="px-4 py-2 text-center">Líneas</th>
                      <th className="px-4 py-2 text-right">Estado inicial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {previewData.result.orders.map((o, idx) => (
                      <tr key={idx} className="hover:bg-bg/40">
                        <td className="px-4 py-2 font-bold text-text">{o.order_number}</td>
                        <td className="px-4 py-2 text-center text-muted">{o.lines}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="rounded-full bg-accentSoft text-text border border-accent px-2 py-0.5 text-xs font-semibold">
                            {release ? 'Pendiente' : 'Borrador'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('select');
                setPreviewData(null);
              }}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
            >
              ← Elegir otro archivo
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={previewData.result.orders_created === 0 || loadingConfirm}
              className="rounded-lg border border-accent bg-accent px-6 py-2 text-sm font-bold text-text hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {loadingConfirm
                ? 'Aplicando importación…'
                : `Confirmar importación (${previewData.result.orders_created} pedidos)`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success Screen */}
      {step === 'completed' && completedData && (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success text-2xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-text">¡Importación completada con éxito!</h2>
          <p className="text-sm text-muted">
            Se crearon exitosamente{' '}
            <strong className="text-text">{completedData.result.orders_created} pedidos</strong>{' '}
            y <strong className="text-text">{completedData.result.lines_created} líneas</strong> en
            la base de datos.
          </p>

          <div className="pt-4 flex justify-center gap-4">
            <Link
              href="/pedidos"
              className="rounded-lg border border-accent bg-accent px-6 py-2.5 text-sm font-bold text-text hover:opacity-90 shadow-sm"
            >
              Ir al listado de pedidos
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep('select');
                setFile(null);
                setPreviewData(null);
                setCompletedData(null);
              }}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text hover:opacity-90 shadow-sm"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
