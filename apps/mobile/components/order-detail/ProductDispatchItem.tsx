import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';
import type { Product, ProductDispatch } from '@/types/db';

type Props = {
  item: ProductDispatch;
  productMap: Map<string, Product> | Record<number, Product>;
  onLongPress?: (item: ProductDispatch) => void;
};

export default function ProductDispatchItem({ item, productMap, onLongPress }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const prod =
    productMap instanceof Map
      ? productMap.get(String(item.product_id))
      : (productMap as Record<number, Product>)[item.product_id];

  return (
    <Pressable
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={500}
      android_ripple={{ color: palette.borderSoft }}
    >
      <ThemedView style={styles.row}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.title, !item.location && styles.noLocation]}
        >
          {item.location ? item.location : 'Sin ubicación'}
        </ThemedText>
        <ThemedText style={styles.sub}>
          {prod ? `${prod.sku} • ${prod.description}` : `Artículo ${item.product_id}`}
        </ThemedText>
        <View style={styles.metaBox}>
          <ThemedText style={styles.meta}>
            {`${item.package_scanned} / ${item.package_total} bultos escaneados`}
          </ThemedText>
          <ThemedText style={styles.meta}>
            {`${item.unit_scanned} / ${item.unit_total} unidades escaneadas`}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    row: {
      borderRadius: 8,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.borderSoft,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    title: { fontSize: 18, marginBottom: 4 },
    noLocation: { opacity: 0.5, fontStyle: 'italic' },
    sub: { opacity: 0.8 },
    metaBox: { marginTop: 8, gap: 2 },
    meta: { opacity: 0.9 },
  });
