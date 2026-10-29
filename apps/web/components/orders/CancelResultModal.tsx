'use client';

import Modal from '@/components/ui/Modal';

export default function CancelResultModal({ open, onClose, deletedCount, }: { open: boolean; onClose: () => void; deletedCount: number; }) {
  const message = deletedCount > 1
    ? `Se cancelaron ${deletedCount} pedido${deletedCount !== 1 ? 's' : ''} correctamente.`
    : 'Se cancelo 1 pedido correctamente.';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pedidos cancelados"
      footer={
        <div className="w-full  flex justify-center">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-yellow px-4 py-2 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-2 text-sm">
        <p>
          {message}
        </p>
      </div>
    </Modal>
  );
}
