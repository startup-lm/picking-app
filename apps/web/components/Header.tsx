'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/brand';

const HIDE_NAV_ON = ['/login', '/reset', '/update-password', '/sin-acceso'];

const NAV_LINKS = [
  { href: '/', label: 'Panel', exact: true },
  { href: '/pedidos', label: 'Pedidos', exact: false },
  { href: '/productos', label: 'Productos', exact: false },
  { href: '/clientes', label: 'Clientes', exact: false },
  { href: '/reportes', label: 'Reportes', exact: false },
  { href: '/usuarios', label: 'Usuarios', exact: false },
  { href: '/ajustes', label: 'Ajustes', exact: false },
];

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

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-white text-2xl tracking-tight leading-none hover:opacity-90">
            {APP_NAME}
          </Link>

          {showNav && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, exact }) => {
                const active = isLinkActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-accent text-text shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {showNav && (
          <div className="flex items-center gap-2">
            <button
              onClick={signOut}
              disabled={busy}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-text hover:opacity-90 disabled:opacity-60 transition"
            >
              {busy ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile nav bar */}
      {showNav && (
        <div className="flex md:hidden overflow-x-auto border-t border-white/10 px-3 py-2 gap-1 bg-primary/95">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = isLinkActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  active
                    ? 'bg-accent text-text'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
