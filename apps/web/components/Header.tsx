'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const HIDE_SIGNOUT_ON = ['/login', '/reset', '/update-password'];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const showSignOut = !HIDE_SIGNOUT_ON.includes(pathname);

  const signOut = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('login_at');
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-red backdrop-blur">
      <div className="relative flex h-20 w-full items-center px-4">
        <div className="absolute left-1/2 -translate-x-1/2 font-bold text-yellow text-3xl leading-none">
          LEGO
        </div>

        {showSignOut && (
          <button
            onClick={signOut}
            disabled={busy}
            className="ml-auto text-sm rounded-lg border border-border bg-yellow px-3 py-1 font-semibold text-text hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        )}
      </div>
    </header>
  );
}