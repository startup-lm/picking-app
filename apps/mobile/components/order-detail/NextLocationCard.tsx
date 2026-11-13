import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import type { OrderDetailLine } from '@/lib/repository/orders';
import type { Stage } from '@/types/rpc';
import { remaining } from '@/utils/progress';

type Props = {
  line: OrderDetailLine | null;
  stage: Stage;
};

export default function NextLocationCard({ line, stage }: Props) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  if (!line) {
    return (
      <View style={[styles.card, styles.cardComplete]}>
        <ThemedText style={styles.completeText}>Todo escaneado ✓</ThemedText>
      </View>
    );
  }

  const remP = remaining(line, stage, 'package');
  const remU = remaining(line, stage, 'unit');
  const loc = line.location?.trim() || 'Sin ubicación';

  return (
    <View style={styles.card}>
      <ThemedText style={styles.locationTitle}>
        SIGUIENTE: {loc}
      </ThemedText>
      <ThemedText style={styles.productText} numberOfLines={2}>
        {line.product.sku} · {line.product.description}
      </ThemedText>
      <ThemedText style={styles.missingText}>
        Faltan {remP} bultos · {remU} unidades
      </ThemedText>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: p.primary,
      padding: 14,
      gap: 4,
    },
    cardComplete: {
      borderColor: p.success,
      backgroundColor: p.surfaceAlt,
      alignItems: 'center',
      paddingVertical: 18,
    },
    locationTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: p.primary,
    },
    productText: {
      fontSize: 14,
      fontWeight: '600',
      color: p.text,
    },
    missingText: {
      fontSize: 13,
      fontWeight: '600',
      color: p.textMuted,
    },
    completeText: {
      fontSize: 18,
      fontWeight: '800',
      color: p.success,
    },
  });
