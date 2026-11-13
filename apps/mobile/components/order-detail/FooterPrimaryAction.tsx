import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

type Props = {
  visible: boolean;
  label: string;
  loading?: boolean;
  onPress?: () => void;
};

export default function FooterPrimaryAction({ visible, label, loading, onPress }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  if (!visible) return null;
  return (
    <View style={styles.container}>
      <Pressable
        disabled={loading}
        onPress={onPress}
        style={[styles.button, loading && styles.buttonLoading]}
      >
        <ThemedText type="defaultSemiBold" style={styles.text}>
          {loading ? 'Procesando…' : label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: { position: 'absolute', left: 20, right: 20, bottom: 36 },
    button: {
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: p.text,
      backgroundColor: p.accent,
    },
    buttonLoading: {
      opacity: 0.6,
    },
    text: {
      fontWeight: '600',
      color: p.onAccent,
    },
  });
