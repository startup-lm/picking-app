'use client';

import Modal from '@/components/ui/Modal';

type CancelError = {
  id: number;
  order_number?: string;
  code: string;
  message: string;
};

export default function CancelResultModal({
  open,
  onClose,
  cancelledCount,
  errors = [],
}: {
  open: boolean;
  onClose: () => void;
  cancelledCount: number;
  errors?: CancelError[];
}) {
  const hasErrors = errors.length > 0;
  const message =
    cancelledCount > 0
      ? cancelledCount === 1
        ? 'Se canceló 1 pedido correctamente.'
        : `Se cancelaron ${cancelledCount} pedidos correctamente.`
      : 'No se canceló ningún pedido.';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resultado de cancelación"
      footer={
        <div className="w-full flex justify-center">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-semibold text-text"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-center font-medium">{message}</p>

        {hasErrors && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-left">
            <p className="font-semibold text-danger mb-2">
              Ocurrieron errores al cancelar:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {errors.map(err => (
                <li key={err.id}>
                  <b>{err.order_number ?? `#${err.id}`}</b>: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
