// hooks/useToast.ts
'use client';

import { useState, useCallback } from 'react';
import { Toast } from '@/components/ui/Toast';
import { ToastVariant } from '@/components/ui/Toast';

type ToastState = {
  open: boolean;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // opcional, por si querés custom
};

export function useToast() {
  const [state, setState] = useState<ToastState>({ open: false, title: '' });

  const show = useCallback(
    (opts: Omit<ToastState, 'open'>) => {
      setState({ open: true, ...opts });
    },
    []
  );

  const hide = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  // No hace falta useCallback acá; es un componentito liviano
  const ToastViewport = () => (
    <Toast
      open={state.open}
      onClose={hide}
      title={state.title}
      description={state.description}
      duration={state.duration}
      variant={state.variant}
    />
  );

  return { show, hide, ToastViewport };
}
