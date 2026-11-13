'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import OrderForm from '@/components/orders/OrderForm';

export default function EditarPedidoPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) throw new Error('Pedido no encontrado');
          throw new Error('No se pudo cargar el pedido');
        }
        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        setErrorMsg(err?.message ?? 'Error al cargar pedido');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted">
        Cargando pedido para editar…
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-danger font-semibold mb-4">{errorMsg ?? 'Pedido no encontrado'}</p>
        <Link
          href="/pedidos"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
        >
          Volver a pedidos
        </Link>
      </div>
    );
  }

  return <OrderForm initialOrder={order} />;
}
