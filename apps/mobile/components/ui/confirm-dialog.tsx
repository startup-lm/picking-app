import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';

type Props = {
  visible: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({visible, message, confirmLabel = 'Confirmar',cancelLabel = 'Cancelar', onConfirm, onCancel, }: Props) {
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%', borderRadius: 12, padding: 18,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 6, alignItems: 'center', 
  },
  message: { fontSize: 22, lineHeight: 32, marginBottom: 36, textAlign: 'center', fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnCancel: { backgroundColor: '#F3F4F6' },
  btnCancelText: { color: '#111827', fontWeight: '400' },
  btnCancelGlow: {
    shadowColor: '#E5E7EB',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnCancelPressed: { backgroundColor: '#E5E7EB' },
  // default confirm button (now the bright variant)
  btnConfirm: { backgroundColor: '#fee14dff' },
  btnConfirmText: { color: '#111827', fontWeight: '500' },
  // glow effect to make it stand out
  btnGlow: {
    shadowColor: '#fee14dff',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  // pressed state: swap to the lighter variant
  btnConfirmPressed: { backgroundColor: '#FFF7D6' },
});
