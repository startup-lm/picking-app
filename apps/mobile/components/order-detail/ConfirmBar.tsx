import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

const CONTROL_HEIGHT = 44;

type Props = {
  allComplete: boolean;
  confirming: boolean;
  onConfirm: () => void;
};

export default function ConfirmBar({ allComplete, confirming, onConfirm }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.topBar}>
      <Pressable
        style={[styles.confirmMain, allComplete ? styles.confirmOk : styles.confirmWarn, confirming && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={confirming}
      >
        <ThemedText
          type="defaultSemiBold"
          style={[styles.confirmText, allComplete ? styles.confirmTextOk : styles.confirmTextWarn]}
        >
          {allComplete ? 'Confirmar pedido' : 'Revisar pendientes'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    topBar: { marginBottom: 8 },
    confirmMain: {
      height: CONTROL_HEIGHT,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: p.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmOk: { backgroundColor: p.accent },
    confirmWarn: { backgroundColor: p.danger },
    confirmText: { fontSize: 14 },
    confirmTextOk: { color: p.onAccent },
    confirmTextWarn: { color: p.onPrimary },
  });