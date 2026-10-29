// components/order-detail/SortTrigger.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  sortKey: 'location' | 'sku';
  sortDir: 'asc' | 'desc';
  onOpen: () => void;
};

export default function SortTrigger({ sortKey, sortDir, onOpen }: Props) {
  const label = `Orden: ${sortKey === 'location' ? 'Ubicación' : 'Artículo'} ${sortDir === 'asc' ? 'A→Z' : 'Z→A'}`;

  return (
    <Pressable
      style={styles.trigger}
      onPress={onOpen}
      android_ripple={{ color: '#ddd', borderless: false }}
    >
      <ThemedText style={styles.text}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    // tamaños alineados con los filtros de Estado/Pasillo
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,            // mantenemos caja recta, no pill, para diferenciar “Orden”
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  text: {
    fontSize: 13,               // igual que los chips
    fontWeight: '600',
    color: '#111827',
  },
});
