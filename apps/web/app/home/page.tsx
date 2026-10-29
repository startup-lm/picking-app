'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="mt-10 rounded-xl border border-border bg-bg p-6 max-w-5xl mx-auto">
      <div className="my-8 flex flex-col items-center gap-10 max-w-2xl mx-auto">
        <button onClick={() => router.push('/cargar-pedido')} className="w-full rounded-lg border border-border bg-card px-6 py-4 text-center text-lg font-semibold text-text hover:opacity-90" >
          CARGAR PEDIDO
        </button>

        <button onClick={() => router.push('/cargar-productos')} className="w-full rounded-lg border border-border bg-card px-6 py-4 text-center text-lg font-semibold text-text hover:opacity-90" >
          CARGAR PRODUCTOS
        </button>

        <button onClick={() => router.push('/imprimir-pedido')} className="w-full rounded-lg border border-border bg-card px-6 py-4 text-center text-lg font-semibold text-text hover:opacity-90" >
          IMPRIMIR PEDIDO
        </button>


        <button onClick={() => router.push('/cancelar-pedido')} className="w-full rounded-lg border border-border bg-card px-6 py-4 text-center text-lg font-semibold text-text hover:opacity-90" >
          CANCELAR PEDIDO
        </button>

        <button onClick={() => router.push('/generar-reporte')} className="w-full rounded-lg border border-border bg-card px-6 py-4 text-center text-lg font-semibold text-text hover:opacity-90" >
          GENERAR REPORTE
        </button>
      </div>
    </div>
  );
}
