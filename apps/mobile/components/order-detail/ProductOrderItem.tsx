import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Product, ProductOrder } from '@/types/db';

type Props = {
  item: ProductOrder;
  productMap: Map<string, Product> | Record<number, Product>;
  onLongPress?: (item: ProductOrder) => void;
};

export default function ProductOrderItem({ item, productMap, onLongPress }: Props) {
  const prod =
    productMap instanceof Map
      ? productMap.get(String(item.product_id))
      : (productMap as Record<number, Product>)[item.product_id];

  return (
    <Pressable
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={500}
      android_ripple={{ color: '#E5E7EB' }}
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

const styles = StyleSheet.create({
  row: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  title: { fontSize: 18, marginBottom: 4 },
  noLocation: { opacity: 0.5, fontStyle: 'italic' },
  sub: { opacity: 0.8 },
  metaBox: { marginTop: 8, gap: 2 },
  meta: { opacity: 0.9 },
});
