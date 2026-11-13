'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';
import type { ImportProductsResult, ImportError } from '@/types/rpc';

const PRODUCT_ERROR_MESSAGES: Record<string, string> = {
  missing_sku: 'Falta el SKU',
  duplicate_sku_in_file: 'SKU repetido en el archivo',
  invalid_units_per_package: 'Unidades por bulto inválidas',
  missing_description: 'Falta la descripción (producto nuevo)',
  missing_barcode: 'Falta al menos un código de barras (producto nuevo)',
  same_barcode: 'Código de unidad y de bulto iguales',
  barcode_in_use: 'Código usado por otro producto',
  duplicate_barcode_in_file: 'Código repetido en el archivo',
};

function translateErrorCode(code: string): string {
  return PRODUCT_ERROR_MESSAGES[code] || code;
}

type ImportResponse = {
  result: ImportProductsResult;
  ignoredColumns: string[];
  totalRows: number;
};

export default function ImportarProductosPage() {
  const { show, ToastViewport } = useToast();

  const [file, setFile] = useState<File | null>(null);
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

      const res = await authFetch('/api/import/products?dry_run=1', {
        method: 'POST',
        body: formData,
      });

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

      const res = await authFetch('/api/import/products?dry_run=0', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errMessage = await readError(res);
        setGeneralError(errMessage);
        return;
      }

      const data: ImportResponse = await res.json();
      setCompletedData(data);
      setStep('completed');
      show({ title: 'Importación completada con éxito', variant: 'success' });
    } catch {
      setGeneralError('Error de conexión al confirmar la importación');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!previewData || !previewData.result.errors.length) return;

    const headers = ['fila', 'sku', 'error'];
    const lines = previewData.result.errors.map((err) => {
      const msg = translateErrorCode(err.code);
      return [err.row, err.sku || '', `"${msg.replace(/"/g, '""')}"`].join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores-productos-${file?.name || 'importacion'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setCompletedData(null);
    setGeneralError(null);
    setStep('select');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToastViewport />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Link href="/productos" className="hover:underline">
              Productos
            </Link>
            <span>/</span>
            <span>Importación masiva</span>
          </div>
          <h1 className="text-2xl font-bold text-text">Importar Productos</h1>
        </div>
      </div>

      {generalError && (
        <div className="p-4 bg-red-50 border border-danger/30 rounded-xl text-danger text-sm">
          {generalError}
        </div>
      )}

      {/* PASO 1: Elegir archivo y descargar plantilla */}
      {step === 'select' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold text-text mb-1">Paso 1: Descargar plantilla y preparar archivo</h2>
            <p className="text-sm text-muted">
              Descargá la plantilla oficial en el formato que prefieras, completá los datos y subí el archivo.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a
                href="/api/import/template?kind=products&format=xlsx"
                download
                className="px-3.5 py-2 border border-border rounded-lg bg-bg text-text hover:bg-border/30 transition text-sm font-medium flex items-center gap-2"
              >
                <span>📊</span> Descargar Plantilla Excel (.xlsx)
              </a>
              <a
                href="/api/import/template?kind=products&format=csv"
                download
                className="px-3.5 py-2 border border-border rounded-lg bg-bg text-text hover:bg-border/30 transition text-sm font-medium flex items-center gap-2"
              >
                <span>📄</span> Descargar Plantilla CSV (.csv)
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text uppercase text-muted">Seleccionar archivo</h3>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-bg/30 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="space-y-2">
                <span className="text-3xl">📁</span>
                <p className="text-sm font-medium text-text">
                  {file ? file.name : 'Hacé clic o arrastrá un archivo CSV o Excel aquí'}
                </p>
                <p className="text-xs text-muted">Formatos aceptados: .xlsx, .csv (máximo 5 MB y 5000 filas)</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handlePreview}
              disabled={!file || loadingPreview}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {loadingPreview ? 'Analizando archivo...' : 'Previsualizar'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Previsualización */}
      {step === 'preview' && previewData && (
        <div className="space-y-6">
          {/* Resumen grande */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-text">Paso 2: Vista previa de importación</h2>
                <p className="text-sm text-muted">Archivo: {file?.name}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-muted hover:text-text underline self-start sm:self-auto"
              >
                Cambiar archivo
              </button>
            </div>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-3xl font-bold text-emerald-700">{previewData.result.created}</span>
                <p className="text-xs font-semibold uppercase text-emerald-800 mt-1">Nuevos a crear</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-3xl font-bold text-blue-700">{previewData.result.updated}</span>
                <p className="text-xs font-semibold uppercase text-blue-800 mt-1">A actualizar</p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  previewData.result.errors.length > 0
                    ? 'bg-red-50 border-danger/30 text-danger'
                    : 'bg-bg border-border text-muted'
                }`}
              >
                <span className="text-3xl font-bold">{previewData.result.errors.length}</span>
                <p className="text-xs font-semibold uppercase mt-1">Con error</p>
              </div>
            </div>

            {/* Columnas ignoradas */}
            {previewData.ignoredColumns.length > 0 && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-accent rounded-lg text-xs text-amber-900">
                <strong>Aviso:</strong> Se encontraron columnas que no coinciden con ningún campo y serán
                ignoradas: {previewData.ignoredColumns.join(', ')}.
              </div>
            )}
          </div>

          {/* Tabla de errores */}
          {previewData.result.errors.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-danger">
                    Filas con errores ({previewData.result.errors.length})
                  </h3>
                  <p className="text-xs text-muted">
                    Estas filas no podrán importarse. Podés descargar la lista para corregirlas.
                  </p>
                </div>
                <button
                  onClick={handleDownloadErrors}
                  className="px-3.5 py-1.5 border border-border rounded-lg bg-bg text-text hover:bg-border/30 transition text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>📥</span> Descargar filas con error
                </button>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg text-muted uppercase font-semibold border-b border-border">
                      <th className="py-2.5 px-3">Fila</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Campo</th>
                      <th className="py-2.5 px-3">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewData.result.errors.map((err: ImportError, idx: number) => (
                      <tr key={idx} className="hover:bg-bg/40">
                        <td className="py-2 px-3 font-mono text-muted">{err.row}</td>
                        <td className="py-2 px-3 font-mono text-text">{err.sku || '—'}</td>
                        <td className="py-2 px-3 text-muted">{err.field || '—'}</td>
                        <td className="py-2 px-3 text-danger font-medium">{translateErrorCode(err.code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acciones de confirmación */}
          <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                loadingConfirm ||
                previewData.result.created + previewData.result.updated === 0
              }
              className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loadingConfirm ? 'Importando...' : 'Confirmar importación'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Completado */}
      {step === 'completed' && completedData && (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">¡Importación completada con éxito!</h2>
            <p className="text-sm text-muted mt-1">
              Se crearon {completedData.result.created} productos nuevos y se actualizaron{' '}
              {completedData.result.updated} productos existentes.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg transition font-medium"
            >
              Importar otro archivo
            </button>
            <Link
              href="/productos"
              className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Ver catálogo de productos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
