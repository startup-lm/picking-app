'use client';

import Modal from '@/components/ui/Modal';

type Item = { id: number; client: string | null };

export default function ConfirmCancelModal({
  open,
  onClose,
  onConfirm,
  orders,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orders: Item[];
  busy?: boolean;
}) {
  const count = orders.length;

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Cancelar pedidos"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg border border-border bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Cancelando…' : 'Cancelar'}
          </button>
        </>
      }
    >
      <div className="text-sm text-center">
        <p>
          Vas a cancelar <b>{count}</b> pedido{count !== 1 ? 's' : ''}:
        </p>

        {/* Contenedor centrado; la lista queda en bloque y con texto a la izq */}
        <div className="mt-2">
          <ul className="list-disc pl-6 space-y-1 inline-block text-left">
            {orders.map(o => (
              <li key={o.id}>
                Pedido <b>#{o.id}</b> — {o.client ?? '-'}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6">
          Esta acción <b>elimina</b> los pedidos de forma permanente.
        </p>
      </div>
    </Modal>
  );
}