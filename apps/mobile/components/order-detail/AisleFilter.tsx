import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

type AisleStat = { letter: string; total: number; pending: number };

type Props = {
  stats: AisleStat[];
  selected: 'ALL' | string;
  onSelect: (val: 'ALL' | string) => void;
};

export default function AisleFilter({ stats, selected, onSelect }: Props) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.row}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        Pasillo:
      </ThemedText>

      <Pressable
        onPress={() => onSelect('ALL')}
        style={[styles.pill, selected === 'ALL' && styles.pillActive]}
        android_ripple={{ color: palette.borderSoft, borderless: false }}
      >
        <ThemedText style={styles.pillText}>Todos</ThemedText>
      </Pressable>

      <View style={styles.wrap}>
        {stats.map(({ letter, total }) => {
          const active = selected === letter;
          const disabled = total === 0;
          return (
            <Pressable
              key={letter}
              onPress={() => onSelect(letter)}
              disabled={disabled}
              style={[
                styles.chip,
                active && styles.chipActive,
                disabled && styles.chipDisabled,
              ]}
              android_ripple={{ color: palette.borderSoft, borderless: true }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[styles.chipText, disabled && styles.chipTextDisabled]}
              >
                {letter}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,             // igual que el de Estado
      paddingTop: 8,
    },
    label: {
      color: p.text,
      fontSize: 13,       // igual que el de Estado
      marginRight: 4,
    },

    // "Todos" como pill (mismo tamaño que Estado)
    pill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    pillActive: {
      backgroundColor: p.accentSoft,
      borderColor: p.accent,
    },
    pillText: {
      color: p.text,
      fontSize: 13,
      fontWeight: '600',
    },

    // Letras A, B, C… con tamaño alineado al filtro de Estado
    wrap: {
      flexDirection: 'row',
      gap: 6,             // igual que el de Estado
      flexShrink: 1,
      minWidth: 0,
      flexWrap: 'wrap',
    },
    chip: {
      width: 30,          // más chico para empatar visual
      height: 30,
      borderRadius: 15,
      backgroundColor: p.background,
      borderWidth: 1,
      borderColor: p.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: p.accentSoft, borderColor: p.accent },
    chipDisabled: { opacity: 0.45 },
    chipText: { fontSize: 13, color: p.text, fontWeight: '600' },
    chipTextDisabled: { color: p.textMuted },
  });
