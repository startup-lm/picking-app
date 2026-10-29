import { useMemo, useRef, useState, useCallback } from 'react';
import ScannerModal, { BarcodeResult } from '@/components/ui/scanner-modal';

type Options = {
  onCode: (data: string, type?: string) => Promise<void>;
  title?: string;
  allowedTypes?: readonly string[];
};

export function useScannerFlow({ onCode, title = 'Escanear código', allowedTypes }: Options) {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const lastTsRef = useRef(0);
  const MIN_INTERVAL_MS = 200;

  const types = useMemo<readonly string[]>(
    () =>
      allowedTypes ??
      ([
        'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
        'code128', 'code39', 'code93', 'itf14', 'codabar',
      ] as const),
    [allowedTypes]
  );

  const openScanner = useCallback(() => {
    if (!locked) setOpen(true);
  }, [locked]);

  const closeScanner = useCallback(() => setOpen(false), []);

  const onScanned = useCallback(
    async (res: BarcodeResult) => {
      const now = Date.now();
      if (now - lastTsRef.current < MIN_INTERVAL_MS) return;
      lastTsRef.current = now;

      if (locked) return;
      setLocked(true);
      setOpen(false); // cerrar cámara primero

      try {
        await onCode(String(res?.data ?? ''), res?.type);
      } finally {
        setTimeout(() => setLocked(false), 200);
      }
    },
    [locked, onCode]
  );

  const Scanner = useCallback(
    () => (
      <ScannerModal
        visible={open}
        onClose={closeScanner}
        onScanned={onScanned}
        types={types}
        title={title}
        scanOnce
      />
    ),
    [open, closeScanner, onScanned, types, title]
  );

  return { openScanner, closeScanner, Scanner, scanningLocked: locked };
}
