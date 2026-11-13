import React, { useMemo } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

type Props = {
  visible: boolean;
  onClose: () => void;
  anchor?: { x: number; y: number; w: number; h: number };
  onViewDetail: () => void;
  onPrint?: () => void;   // opcional: si no lo pasás, desaparece la fila
  onCancel?: () => void;
};

const MENU_W = 160;        // ancho del menú (podés bajarlo a 160/152 si querés)
const ITEM_H = 40;         // altura homogénea
const MARGIN = 8;          // margen a los bordes de pantalla

export default function MenuOptions({
  visible,
  onClose,
  anchor,
  onViewDetail,
  onPrint,
  onCancel,
}: Props) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { height: H, width: W } = Dimensions.get('window');
  const showPrint = typeof onPrint === 'function';

  // Alto dinámico según cantidad visible de ítems
  const itemsCount = 2 + (showPrint ? 1 : 0); // Ver detalle + (Imprimir) + Cancelar
  const MENU_H = itemsCount * ITEM_H + (itemsCount - 1) * StyleSheet.hairlineWidth;

  // Posición: pegado al borde derecho del botón y preferencia hacia abajo, con clamp
  const pos = useMemo(() => {
    const ax = anchor?.x ?? (W - MENU_W - MARGIN);
    const ay = anchor ? anchor.y : MARGIN;
    const aw = anchor?.w ?? 0;
    const ah = anchor?.h ?? 0;

    // Alinear borde derecho del menú con el borde derecho del botón ⋮
    let left = ax + aw - MENU_W;
    // Preferencia: abrir debajo del botón
    let top = ay + ah + 6;

    // Si no entra abajo, lo abrimos hacia arriba
    if (top + MENU_H + MARGIN > H) {
      top = Math.max(MARGIN, ay - MENU_H - 6);
    }

    // Clamp horizontal y vertical
    left = Math.min(Math.max(left, MARGIN), W - MENU_W - MARGIN);
    top = Math.min(Math.max(top, MARGIN), H - MENU_H - MARGIN);

    return { top, left };
  }, [anchor, H, W, MENU_H]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.menu, { top: pos.top, left: pos.left, width: MENU_W }]}>
        <Pressable
          style={styles.item}
          android_ripple={{ color: palette.surfaceAlt }}
          onPress={() => { onClose(); onViewDetail(); }}
        >
          <ThemedText style={styles.itemText}>Ver detalle</ThemedText>
        </Pressable>

        <View style={styles.sep} />

        {showPrint && (
          <>
            <Pressable
              style={styles.item}
              android_ripple={{ color: palette.surfaceAlt }}
              onPress={() => { onClose(); onPrint!(); }}
            >
              <ThemedText style={styles.itemText}>Imprimir</ThemedText>
            </Pressable>
            <View style={styles.sep} />
          </>
        )}

        {onCancel && <View style={styles.sep} />}

        {/* Cancelar (si existe) */}
        {onCancel && (
          <Pressable style={styles.item} android_ripple={{ color: palette.surfaceAlt }}
            onPress={() => { onClose(); onCancel(); }}>
            <ThemedText style={styles.itemText}>Cancelar</ThemedText>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    backdrop: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'transparent',
    },
    menu: {
      position: 'absolute',
      borderRadius: 14,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.borderSoft,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: p.text,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    item: {
      height: ITEM_H,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: p.surface,
    },
    itemText: { fontSize: 16, color: p.text },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: p.borderSoft },
  });
