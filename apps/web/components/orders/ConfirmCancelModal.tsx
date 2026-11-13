'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';

type Item = { id: number; order_number: string; customer: string };

export default function ConfirmCancelModal({
  open,
  onClose,
  onConfirm,
  orders,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orders: Item[];
  busy?: boolean;
}) {
  const [reason, setReason] = useState('');
  const count = orders.length;

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const canConfirm = reason.trim().length > 0 && !busy;

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
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="rounded-lg border border-border bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Cancelando…' : 'Cancelar'}
          </button>
        </>
      }
    >
      <div className="text-sm space-y-4">
        <p className="text-center">
          Vas a cancelar <b>{count}</b> pedido{count !== 1 ? 's' : ''}:
        </p>

        <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card p-2">
          <ul className="list-disc pl-5 space-y-1 text-left">
            {orders.map(o => (
              <li key={o.id}>
                Pedido <b>{o.order_number}</b> — {o.customer || '-'}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text">
            Motivo de cancelación <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            placeholder="Ingresá el motivo de la cancelación…"
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-bgInput px-3 py-2 text-sm text-text outline-none placeholder:text-muted"
          />
        </div>

        <p className="text-xs text-muted text-center">
          Esta acción cancelará los pedidos y no se podrá revertir.
        </p>
      </div>
    </Modal>
  );
}
