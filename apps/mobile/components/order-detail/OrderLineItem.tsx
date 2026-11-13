import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';
import type { OrderDetailLine } from '@/lib/repository/orders';
import type { Stage } from '@/types/rpc';
import { progressOf } from '@/utils/progress';

type Props = {
  line: OrderDetailLine;
  stage: Stage;
  onLongPress?: (line: OrderDetailLine) => void;
};

export default function OrderLineItem({ line, stage, onLongPress }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const progress = progressOf(line, stage);

  return (
    <Pressable
      onLongPress={() => onLongPress?.(line)}
      delayLongPress={500}
      android_ripple={{ color: palette.borderSoft }}
    >
      <ThemedView style={styles.row}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.title, !line.location && styles.noLocation]}
        >
          {line.location ? line.location : 'Sin ubicación'}
        </ThemedText>
        <ThemedText style={styles.sub}>
          {line.product ? `${line.product.sku} • ${line.product.description}` : `Artículo ${line.product_id}`}
        </ThemedText>
        <View style={styles.metaBox}>
          <ThemedText style={styles.meta}>
            {`${progress.pkgDone} / ${progress.pkgTotal} bultos`}
          </ThemedText>
          <ThemedText style={styles.meta}>
            {`${progress.unitDone} / ${progress.unitTotal} unidades`}
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
