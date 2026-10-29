'use client';
import { useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

const styles = {
  success: {
    border: 'border-green-300',
    text: 'text-green-800',
    accent: 'bg-green-500',
  },
  error: {
    border: 'border-red-300',
    text: 'text-red-800',
    accent: 'bg-red-500',
  },
  info: {
    border: 'border-blue-300',
    text: 'text-blue-800',
    accent: 'bg-blue-500',
  },
} as const;

export function Toast(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  duration?: number; // ms
  variant?: ToastVariant;
}) {
  const { open, onClose, title, description, duration = 6000, variant = 'success' } = props;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const s = styles[variant];

  return (
    <div
      className={`fixed right-6 top-20 z-[1000] w-[32rem] max-w-[95vw] rounded-2xl border ${s.border} bg-white p-6 shadow-xl`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`mt-0.5 h-6 w-6 rounded-full ${s.accent} text-white flex items-center justify-center text-sm`}
        >
          ✓
        </div>
        <div className={`leading-snug ${s.text}`}>
          <p className="font-semibold text-base">{title}</p>
          {description && <p className="mt-1 text-[0.975rem] opacity-90 whitespace-pre-line">{description}</p>}
        </div>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1.5 opacity-80 hover:opacity-100 hover:bg-black/5"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}