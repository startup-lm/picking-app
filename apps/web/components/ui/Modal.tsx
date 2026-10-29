'use client';

import { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string; // ej: max-w-lg, max-w-2xl
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div className={`w-full ${widthClass} rounded-xl border border-border bg-card shadow-xl`}>
          {title && (
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-center">{title}</h2>
            </div>
          )}
          <div className="px-5 py-4 text-center">{children}</div>
          {footer && <div className="border-t border-border px-5 py-4 flex justify-center gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
