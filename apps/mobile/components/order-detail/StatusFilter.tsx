// components/order-detail/CompletionFilter.tsx
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';
import type { Statuses } from '@/utils/completion';

type Props = {
  status: Statuses;
  onChange: (m: Statuses) => void;
};

const options: { key: Statuses; label: string }[] = [
  { key: 'all',      label: 'Todos' },
  { key: 'pending',  label: 'Pendiente' },
  { key: 'complete', label: 'Completado' },
];

export default function StatusFilter({ status, onChange }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.oneRow}>
      <ThemedText type="defaultSemiBold" style={styles.label}>Estado:</ThemedText>

      <View style={styles.pillsRow}>
        {options.map(opt => {
          const active = status === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[styles.chip, active && styles.chipActive]}
              android_ripple={{ color: palette.borderSoft, borderless: false }}
            >
              <ThemedText style={styles.chipText}>{opt.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    oneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 8,
    },
    label: {
      color: p.text,
      fontSize: 13,
      marginRight: 4,
    },
    pillsRow: {
      flexDirection: 'row',
      gap: 6,
      flexShrink: 1,   // permite que los chips se achiquen antes de saltar de línea
      minWidth: 0,     // habilita el shrink correcto en Android
    },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    chipActive: {
      backgroundColor: p.accentSoft,
      borderColor: p.accent,
    },
    chipText: {
      color: p.text,
      fontSize: 13,
      fontWeight: '600',
    },
  });