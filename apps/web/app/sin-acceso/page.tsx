'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SinAccesoPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-16 mx-auto w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accentSoft text-accent">
        <svg
          className="h-8 w-8 text-danger"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-text">Acceso Restringido</h1>
      <p className="mt-3 text-muted">
        Tu usuario no tiene acceso al panel de administración
      </p>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleSignOut}
          disabled={busy}
          className="rounded-lg border border-border bg-accent px-6 py-2.5 font-bold text-text hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}
