import { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

type Props = {
  visible: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({visible, message, confirmLabel = 'Confirmar',cancelLabel = 'Cancelar', onConfirm, onCancel, }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.btnCancel,
                styles.btnCancelGlow,
                pressed && styles.btnCancelPressed,
              ]}
            >
              <ThemedText style={styles.btnCancelText}>{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                styles.btnConfirm,
                styles.btnGlow,
                pressed && styles.btnConfirmPressed,
              ]}
            >
              <ThemedText style={styles.btnConfirmText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%', borderRadius: 12, padding: 18,
      backgroundColor: p.surface,
      shadowColor: p.text, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
      elevation: 6, alignItems: 'center', 
    },
    message: { fontSize: 22, lineHeight: 32, marginBottom: 36, textAlign: 'center', fontWeight: '500', color: p.text },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
    btnCancel: { backgroundColor: p.surfaceAlt },
    btnCancelText: { color: p.text, fontWeight: '400' },
    btnCancelGlow: {
      shadowColor: p.borderSoft,
      shadowOpacity: 0.5,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    btnCancelPressed: { backgroundColor: p.borderSoft, opacity: 0.85 },
    // default confirm button (now the bright variant)
    btnConfirm: { backgroundColor: p.accent },
    btnConfirmText: { color: p.onAccent, fontWeight: '500' },
    // glow effect to make it stand out
    btnGlow: {
      shadowColor: p.accent,
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    // pressed state
    btnConfirmPressed: { backgroundColor: p.accent, opacity: 0.85 },
  });
