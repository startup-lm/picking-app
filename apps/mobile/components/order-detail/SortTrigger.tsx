// components/order-detail/SortTrigger.tsx
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

type Props = {
  sortKey: 'location' | 'sku';
  sortDir: 'asc' | 'desc';
  onOpen: () => void;
};

export default function SortTrigger({ sortKey, sortDir, onOpen }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const label = `Orden: ${sortKey === 'location' ? 'Ubicación' : 'Artículo'} ${sortDir === 'asc' ? 'A→Z' : 'Z→A'}`;

  return (
    <Pressable
      style={styles.trigger}
      onPress={onOpen}
      android_ripple={{ color: palette.borderSoft, borderless: false }}
    >
      <ThemedText style={styles.text}>{label}</ThemedText>
    </Pressable>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    trigger: {
      // tamaños alineados con los filtros de Estado/Pasillo
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,            // mantenemos caja recta, no pill, para diferenciar “Orden”
      borderWidth: 1,
      borderColor: p.borderSoft,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    text: {
      fontSize: 13,               // igual que los chips
      fontWeight: '600',
      color: p.text,
    },
  });
