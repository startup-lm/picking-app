// components/ui/ScannerModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

export type BarcodeResult = { data: string; type: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (result: BarcodeResult) => void;
  types?: readonly string[]; // formatos a habilitar (opcional)
  title?: string;
  scanOnce?: boolean; // default: true
};

export default function ScannerModal({
  visible,
  onClose,
  onScanned,
  types,
  title = 'Escanear código',
  scanOnce = true,
}: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Evita rebotes (onBarcodeScanned puede disparar varias veces)
  const lockRef = useRef(false);
  // Anti-doble lectura por hardware en milisegundos (defensivo)
  const lastTsRef = useRef(0);
  const MIN_INTERVAL_MS = 200;

  // Pide permiso al abrir; resetea flags al cerrar
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (visible) {
        if (!permission?.granted && permission?.canAskAgain !== false) {
          await requestPermission();
        }
      }
      if (!visible && mounted) {
        setScanned(false);
        lockRef.current = false;
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible, permission?.granted, permission?.canAskAgain, requestPermission]);

  const barcodeTypes = useMemo(
    () =>
      types ??
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
    [types]
  );

  const handleBarcode = useCallback(
    (result: { data: string; type: string }) => {
      // Throttle defensivo
      const now = Date.now();
      if (now - lastTsRef.current < MIN_INTERVAL_MS) return;
      lastTsRef.current = now;

      // Si es "una vez" y ya bloqueamos, ignorar
      if (scanOnce && (lockRef.current || scanned)) return;

      // Bloqueamos de inmediato y desactivamos cámara
      lockRef.current = true;
      setScanned(true); // esto deja de renderizar la CameraView (ver abajo)

      // Llamamos al parent
      onScanned({ data: result.data, type: result.type });
    },
    [onScanned, scanOnce, scanned]
  );

  // Renderizamos la cámara **solo** si:
  // - el modal está visible
  // - hay permisos
  // - no “consumimos” ya un escaneo (cuando scanned === true, se desmonta CameraView)
  const shouldRenderCamera = visible && permission?.granted && !(scanOnce && scanned);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        {shouldRenderCamera ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: barcodeTypes as any }}
            onBarcodeScanned={(res) => handleBarcode({ data: res.data, type: res.type })}
          />
        ) : (
          <View style={[styles.camera, styles.center]}>
            {!permission?.granted ? (
              <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                Se requiere permiso de cámara para escanear.
              </ThemedText>
            ) : (
              // Pequeño placeholder mientras se cierra el modal desde el parent
              <ThemedText style={styles.processingText}>Procesando…</ThemedText>
            )}
          </View>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <ThemedText type="defaultSemiBold" style={styles.topBarTitle}>
            {title}
          </ThemedText>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <ThemedText type="defaultSemiBold" style={styles.closeBtnText}>
              Cerrar
            </ThemedText>
          </Pressable>
        </View>

        {/* Marco guía */}
        <View style={styles.aimBox} pointerEvents="none" />
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: p.background },
    camera: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    processingText: { color: p.onPrimary, opacity: 0.7 },
    topBar: {
      position: 'absolute',
      top: 48,
      left: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    topBarTitle: {
      color: p.onPrimary,
      fontSize: 16,
      flex: 1,
    },
    closeBtn: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    closeBtnText: {
      color: p.onPrimary,
    },
    aimBox: {
      position: 'absolute',
      top: '25%',
      left: '10%',
      right: '10%',
      height: '35%',
      borderWidth: 2,
      borderColor: p.onPrimary,
      borderRadius: 12,
      opacity: 0.6,
    },
  });
