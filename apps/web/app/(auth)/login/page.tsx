// app/(auth)/login/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';

// Opcional: evita SSG y reduce el warning en entornos mixtos
export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Modal de mensajes
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });
  const openModal = (title: string, message: string) => setModal({ open: true, title, message });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/home');
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('login_at', String(Date.now()));
      const to = search.get('redirectedFrom') || '/home';
      router.replace(to);
    } catch (err: any) {
      openModal('Error de autenticación', err?.message ? 'Email y/o contraseña incorrecto/s' :  'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 mx-auto w-full max-w-3xl rounded-xl border border-border bg-bg px-4 py-10">
      {/* Modal de error */}
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
              Cerrar
            </button>
          </div>
        }
      >
        <p className="text-sm text-center whitespace-pre-line">{modal.message}</p>
      </Modal>

      <h1 className="text-center text-2xl font-bold">Iniciar sesión</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-8 max-w-sm mx-auto">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none placeholder:text-muted"
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-text outline-none placeholder:text-muted"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/reset')}
              className="text-sm text-muted underline hover:text-text"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-accent px-6 py-2 font-bold text-text disabled:opacity-60"
          >
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-10 mx-auto w-full max-w-3xl rounded-xl border border-border bg-bg px-4 py-10 text-sm text-muted">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}