import { useCallback, useMemo, useRef, useState } from 'react';
import ScannerModal, {
  type BarcodeResult,
  type ScannerLastResult,
} from '@/components/ui/scanner-modal';

type UseScannerFlowOptions = {
  onCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  title?: string;
  allowedTypes?: readonly string[];
};

export function useScannerFlow({
  onCode,
  title = 'Escanear código',
  allowedTypes,
}: UseScannerFlowOptions) {
  const [open, setOpen] = useState(false);
  const [lastResult, setLastResult] = useState<ScannerLastResult | undefined>(undefined);

  const lastCodeRef = useRef<string>('');
  const lastAtRef = useRef<number>(0);
  const busyRef = useRef<boolean>(false);

  const types = useMemo<readonly string[]>(
    () =>
      allowedTypes ??
      ([
        'qr',
        'ean13',
        'ean8',
        'upc_a',
        'upc_e',
        'code128',
        'code39',
        'code93',
        'itf14',
        'codabar',
      ] as const),
    [allowedTypes]
  );

  const openScanner = useCallback(() => {
    setOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setOpen(false);
  }, []);

  const submitCode = useCallback(
    async (raw: string): Promise<{ ok: boolean; message: string } | undefined> => {
      const code = (raw ?? '').trim();
      if (!code) return;

      // Si se está procesando un escaneo, los nuevos se descartan (no se encolan)
      if (busyRef.current) return;

      const now = Date.now();
      const elapsed = now - lastAtRef.current;

      // El mismo código se ignora durante 1500 ms
      if (code === lastCodeRef.current && elapsed < 1500) {
        return;
      }

      // Un código distinto se acepta después de 300 ms
      if (code !== lastCodeRef.current && elapsed < 300) {
        return;
      }

      busyRef.current = true;
      lastCodeRef.current = code;
      lastAtRef.current = now;

      try {
        const res = await onCode(code);
        setLastResult({
          kind: res.ok ? 'success' : 'error',
          text: res.message,
          at: Date.now(),
        });
        return res;
      } finally {
        busyRef.current = false;
      }
    },
    [onCode]
  );

  const onScanned = useCallback(
    (res: BarcodeResult) => {
      void submitCode(res.data);
    },
    [submitCode]
  );

  const Scanner = useCallback(
    () => (
      <ScannerModal
        visible={open}
        onClose={closeScanner}
        onScanned={onScanned}
        types={types}
        title={title}
        lastResult={lastResult}
      />
    ),
    [open, closeScanner, onScanned, types, title, lastResult]
  );

  return { openScanner, closeScanner, Scanner, submitCode };
}
