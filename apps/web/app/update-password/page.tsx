'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  // Detecta sesión válida al aterrizar desde el link de recuperación
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(true);
      }
      setReady(true);
    });
    // también chequeo directo por si ya existe
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setHasSession(true);
      setReady(true);
    })();
    return () => sub.data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return alert('La contraseña debe tener al menos 6 caracteres.');
    if (password !== password2) return alert('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert('Contraseña actualizada. Iniciá sesión nuevamente.');
      router.replace('/login');
    } catch (err: any) {
      alert(err?.message ?? 'No se pudo actualizar la contraseña');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <div className="flex h-[60vh] items-center justify-center"><p>Cargando…</p></div>;
  }

  if (!hasSession) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-center text-2xl font-bold">Actualizar contraseña</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Abrí el enlace de recuperación que te enviamos por email para continuar.
        </p>
        <div className="mt-4 text-center">
          <a href="/reset" className="text-sm text-muted underline hover:text-text">
            Reenviar enlace de recuperación
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-center text-2xl font-bold">Definir nueva contraseña</h1>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <input
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none placeholder:text-muted"
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <input
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none placeholder:text-muted"
            type="password"
            placeholder="Repetir contraseña"
            value={password2}
            onChange={e=>setPassword2(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            className="inline-flex items-center justify-center rounded-lg border border-border bg-yellow px-4 py-2 font-bold text-text disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
