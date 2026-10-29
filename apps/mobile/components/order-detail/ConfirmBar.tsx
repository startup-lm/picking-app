import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const CONTROL_HEIGHT = 44;

type Props = {
  allComplete: boolean;
  confirming: boolean;
  onConfirm: () => void;
};

export default function ConfirmBar({ allComplete, confirming, onConfirm }: Props) {
  return (
    <View style={styles.topBar}>
      <Pressable
        style={[styles.confirmMain, allComplete ? styles.confirmOk : styles.confirmWarn, confirming && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={confirming}
      >
        <ThemedText type="defaultSemiBold" style={styles.confirmText}>
          {allComplete ? 'Confirmar pedido' : 'Revisar pendientes'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { marginBottom: 8 },
  confirmMain: {
    height: CONTROL_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOk: { backgroundColor: '#FCD34D' },
  confirmWarn: { backgroundColor: '#C0392B' },
  confirmText: { fontSize: 14 },
});