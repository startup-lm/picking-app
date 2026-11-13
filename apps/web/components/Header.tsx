'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/brand';

const HIDE_NAV_ON = ['/login', '/reset', '/update-password', '/sin-acceso'];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const showNav = !HIDE_NAV_ON.includes(pathname);

  const signOut = async () => {
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
    <header className="sticky top-0 z-40 border-b border-border bg-primary backdrop-blur">
      <div className="relative flex h-20 w-full items-center px-4">
        <Link href="/home" className="absolute left-1/2 -translate-x-1/2 font-bold text-white text-3xl leading-none">
          {APP_NAME}
        </Link>

        {showNav && (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/usuarios"
              className="text-sm rounded-lg border border-border bg-card px-3 py-1 font-semibold text-text hover:opacity-90"
            >
              Usuarios
            </Link>
            <Link
              href="/ajustes"
              className="text-sm rounded-lg border border-border bg-card px-3 py-1 font-semibold text-text hover:opacity-90"
            >
              Ajustes
            </Link>
            <button
              onClick={signOut}
              disabled={busy}
              className="text-sm rounded-lg border border-border bg-accent px-3 py-1 font-semibold text-text hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
