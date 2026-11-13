'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, readError } from '@/lib/api/http';
import { useToast } from '@/hooks/useToast';

export default function AjustesPage() {
  const { show, ToastViewport } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [appName, setAppName] = useState('Pickflow');
  const [primaryColor, setPrimaryColor] = useState('#0F4C5C');
  const [accentColor, setAccentColor] = useState('#F2A541');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [dispatchCheckEnabled, setDispatchCheckEnabled] = useState(true);

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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ToastViewport />

      <div>
        <h1 className="text-2xl font-bold text-text">Ajustes del Sistema</h1>
        <p className="text-sm text-muted mt-1">
          Configuración general, colores institucionales y reglas operativas.
        </p>
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
