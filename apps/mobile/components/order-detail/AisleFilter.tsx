import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type AisleStat = { letter: string; total: number; pending: number };

type Props = {
  stats: AisleStat[];
  selected: 'ALL' | string;
  onSelect: (val: 'ALL' | string) => void;
};

export default function AisleFilter({ stats, selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        Pasillo:
      </ThemedText>

      <Pressable
        onPress={() => onSelect('ALL')}
        style={[styles.pill, selected === 'ALL' && styles.pillActive]}
        android_ripple={{ color: '#ddd', borderless: false }}
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
              android_ripple={{ color: '#ddd', borderless: true }}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,             // igual que el de Estado
    paddingTop: 8,
  },
  label: {
    color: '#374151',
    fontSize: 13,       // igual que el de Estado
    marginRight: 4,
  },

  // "Todos" como pill (mismo tamaño que Estado)
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pillActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#1F2937',
  },
  pillText: {
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#FDE68A', borderColor: '#1F2937' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, color: '#111827', fontWeight: '600' },
  chipTextDisabled: { color: '#9CA3AF' },
});
