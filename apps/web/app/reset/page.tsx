'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      alert(err?.message ?? 'No se pudo enviar el email de recuperación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-center text-2xl font-bold">Restablecer contraseña</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg border border-border bg-bg p-4 text-center">
          <p>
            Te enviamos un email a <span className="font-semibold">{email}</span> con instrucciones.
          </p>
          <p className="mt-1 text-sm text-muted">Revisá también tu carpeta de spam.</p>
          <a href="/login" className="mt-4 inline-block text-sm text-muted underline hover:text-text">
            Volver al login
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <input
              className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none placeholder:text-muted"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <a href="/login" className="text-sm text-muted underline hover:text-text">
              Volver al login
            </a>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-border bg-yellow px-4 py-2 font-bold text-text disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              {busy ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
