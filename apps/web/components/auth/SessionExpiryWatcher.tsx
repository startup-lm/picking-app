'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;   // 8h
const IDLE_MAX_MS       = 30 * 60 * 1000;       // 30 min

export default function SessionExpiryWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ageTimer  = useRef<ReturnType<typeof setInterval> | null>(null);

  // cierra sesión y redirige al login
  const forceSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.replace(`/login?redirectedFrom=${encodeURIComponent(pathname || '/home')}`);
  };

  // reinicia contador de inactividad
  const bumpIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(forceSignOut, IDLE_MAX_MS);
  };

  useEffect(() => {
    let mounted = true;

    // 1) Inactividad: eventos que cuentan como actividad
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, bumpIdle, { passive: true }));
    bumpIdle(); // arranca el timer

    // 2) Edad de sesión: chequea cada minuto
    ageTimer.current = setInterval(() => {
      const loginAt = Number(localStorage.getItem('login_at') || 0);
      if (!loginAt) return; // aún no logueado en esta pestaña
      const age = Date.now() - loginAt;
      if (age > SESSION_MAX_AGE_MS) forceSignOut();
    }, 60_000);

    // 3) Si no hay sesión, no vigiles nada
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        // por si quedó login_at viejo
        localStorage.removeItem('login_at');
      }
    })();

    return () => {
      mounted = false;
      events.forEach(ev => window.removeEventListener(ev, bumpIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (ageTimer.current) clearInterval(ageTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}