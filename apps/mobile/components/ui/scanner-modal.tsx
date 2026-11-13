// components/ui/scanner-modal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

export type BarcodeResult = { data: string; type: string };

export type ScannerLastResult = {
  kind: 'success' | 'error';
  text: string;
  at: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (result: BarcodeResult) => void;
  types?: readonly string[];
  title?: string;
  lastResult?: ScannerLastResult;
};

export default function ScannerModal({
  visible,
  onClose,
  onScanned,
  types,
  title = 'Escanear código',
  lastResult,
}: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [permission, requestPermission] = useCameraPermissions();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted && permission?.canAskAgain !== false) {
      void requestPermission();
    }
  }, [visible, permission?.granted, permission?.canAskAgain, requestPermission]);

  useEffect(() => {
    if (!lastResult) return;
    setShowBanner(true);
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [lastResult]);

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

  const shouldRenderCamera = visible && permission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        {shouldRenderCamera ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: barcodeTypes as any }}
            onBarcodeScanned={(res) => onScanned({ data: res.data, type: res.type })}
          />
        ) : (
          <View style={[styles.camera, styles.center]}>
            {!permission?.granted ? (
              <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                Se requiere permiso de cámara para escanear.
              </ThemedText>
            ) : null}
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

        {/* Banda inferior con el resultado del último escaneo */}
        {showBanner && lastResult ? (
          <View
            style={[
              styles.resultBanner,
              {
                backgroundColor:
                  lastResult.kind === 'success' ? palette.success : palette.danger,
              },
            ]}
          >
            <ThemedText style={[styles.resultBannerText, { color: palette.onPrimary }]}>
              {lastResult.text}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' }, // fondo de cámara, no es token de tema
    camera: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
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
    resultBanner: {
      position: 'absolute',
      bottom: 60,
      left: 20,
      right: 20,
      paddingVertical: 18,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultBannerText: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
