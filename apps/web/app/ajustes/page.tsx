'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase/client';

export default function AjustesPage() {
  const { show, ToastViewport } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [appName, setAppName] = useState('Pickflow');
  const [primaryColor, setPrimaryColor] = useState('#0F4C5C');
  const [accentColor, setAccentColor] = useState('#F2A541');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [dispatchCheckEnabled, setDispatchCheckEnabled] = useState(true);

  // Logo state
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  const timezones = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : ['America/Argentina/Buenos_Aires', 'UTC'];

  const loadSettings = useCallback(async () => {
    try {
      const res = await authFetch('/api/settings');
      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al cargar ajustes', description: err, variant: 'error' });
        return;
      }
      const data = await res.json();
      if (data.settings) {
        setAppName(data.settings.app_name ?? 'Pickflow');
        setPrimaryColor(data.settings.primary_color ?? '#0F4C5C');
        setAccentColor(data.settings.accent_color ?? '#F2A541');
        setTimezone(data.settings.timezone ?? 'America/Argentina/Buenos_Aires');
        setDispatchCheckEnabled(Boolean(data.settings.dispatch_check_enabled));

        if (data.settings.logo_path) {
          setLogoPath(data.settings.logo_path);
          const { data: urlData } = supabase.storage
            .from('branding')
            .getPublicUrl(data.settings.logo_path);
          setLogoUrl(urlData?.publicUrl ?? null);
        } else {
          setLogoPath(null);
          setLogoUrl(null);
        }
      }
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudieron cargar los ajustes', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(selectedFile.type)) {
      show({ title: 'Formato inválido', description: 'Debe ser PNG, JPEG, WebP o SVG', variant: 'error' });
      return;
    }

    if (selectedFile.size > 1024 * 1024) {
      show({ title: 'Archivo muy pesado', description: 'El logo no debe superar 1 MB', variant: 'error' });
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await authFetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al subir logo', description: err, variant: 'error' });
        return;
      }

      const data = await res.json();
      setLogoPath(data.logo_path);
      setLogoUrl(data.logo_url);
      setSelectedFile(null);
      setPreviewUrl(null);
      show({ title: 'Logo actualizado', description: 'El logo se guardó correctamente', variant: 'success' });
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudo subir el logo', variant: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    setDeletingLogo(true);
    try {
      const res = await authFetch('/api/settings/logo', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al quitar logo', description: err, variant: 'error' });
        return;
      }

      setLogoPath(null);
      setLogoUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      show({ title: 'Logo eliminado', description: 'Se quitó el logo de la aplicación', variant: 'success' });
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudo quitar el logo', variant: 'error' });
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appName.trim() || appName.trim().length > 60) {
      show({ title: 'Nombre inválido', description: 'El nombre debe tener entre 1 y 60 caracteres', variant: 'error' });
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      show({ title: 'Color primario inválido', description: 'Debe ser un código hexadecimal de 6 dígitos (#RRGGBB)', variant: 'error' });
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
      show({ title: 'Color de acento inválido', description: 'Debe ser un código hexadecimal de 6 dígitos (#RRGGBB)', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName.trim(),
          primary_color: primaryColor,
          accent_color: accentColor,
          timezone,
          dispatch_check_enabled: dispatchCheckEnabled,
        }),
      });

      if (!res.ok) {
        const err = await readError(res);
        show({ title: 'Error al guardar ajustes', description: err, variant: 'error' });
        return;
      }

      show({ title: 'Ajustes guardados', description: 'Los cambios se aplicaron correctamente', variant: 'success' });
    } catch {
      show({ title: 'Error de conexión', description: 'No se pudieron guardar los ajustes', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl mt-12 text-center text-sm text-muted">
        Cargando ajustes…
      </div>
    );
  }

  const displayUrl = previewUrl || logoUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ToastViewport />

      <div>
        <h1 className="text-2xl font-bold text-text">Ajustes del Sistema</h1>
        <p className="text-sm text-muted mt-1">
          Configuración general, colores institucionales y reglas operativas.
        </p>
      </div>

      {/* Sección Logo */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-text">Logo Institucional</h2>
          <p className="text-xs text-muted mt-0.5">
            Imagen pública de marca (PNG, JPEG, WebP o SVG, máx. 1 MB). Se muestra en la barra de navegación y en la app móvil.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-shrink-0">
            {displayUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayUrl}
                alt="Vista previa del logo"
                className="h-16 w-48 object-contain rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <div className="h-16 w-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted">
                Sin logo configurado
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="text-xs text-text file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-bg file:text-text hover:file:opacity-90 cursor-pointer"
            />

            <div className="flex items-center gap-3">
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadLogo}
                  disabled={uploadingLogo}
                  className="rounded-lg border border-border bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {uploadingLogo ? 'Subiendo…' : 'Subir logo'}
                </button>
              )}

              {logoPath && (
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={deletingLogo}
                  className="rounded-lg border border-danger bg-card px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                >
                  {deletingLogo ? 'Quitando…' : 'Quitar logo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        {/* Nombre de la app */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1">
            Nombre de la aplicación
          </label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            maxLength={60}
            required
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary placeholder:text-muted"
          />
          <span className="text-xs text-muted mt-1 block">Hasta 60 caracteres.</span>
        </div>

        {/* Color Primario */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1">
            Color primario
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              maxLength={7}
              required
              className="w-32 rounded-lg border border-border bg-bgInput px-3 py-2 font-mono text-sm text-text outline-none focus:border-primary uppercase"
            />
          </div>
        </div>

        {/* Color de Acento */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1">
            Color de acento
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              maxLength={7}
              required
              className="w-32 rounded-lg border border-border bg-bgInput px-3 py-2 font-mono text-sm text-text outline-none focus:border-primary uppercase"
            />
          </div>
        </div>

        {/* Zona Horaria */}
        <div>
          <label className="block text-sm font-semibold text-text mb-1">
            Zona horaria
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none focus:border-primary"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Control de Despacho */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dispatchCheckEnabled}
              onChange={(e) => setDispatchCheckEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-text select-none">
              Habilitar control de despacho (chequeo obligatorio antes de despachar)
            </span>
          </label>
        </div>

        {/* Botón Guardar */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-border bg-accent px-6 py-2.5 font-bold text-text hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar ajustes'}
          </button>
        </div>
      </form>
    </div>
  );
}
