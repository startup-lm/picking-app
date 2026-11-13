import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export type ToastKind = 'success' | 'error' | 'info';

export function useToast() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [state, setState] = useState<{
    visible: boolean;
    text: string;
    kind: ToastKind;
  }>({
    visible: false,
    text: '',
    kind: 'info',
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string, kind: ToastKind = 'info', ms = 1800) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setState({ visible: true, text, kind });
      timerRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, visible: false }));
        timerRef.current = null;
      }, ms);
    },
    []
  );

  const ToastOverlay = useCallback(() => {
    if (!state.visible) return null;

    const bgColor =
      state.kind === 'success'
        ? palette.success
        : state.kind === 'error'
        ? palette.danger
        : palette.primary;

    return (
      <View style={styles.container} pointerEvents="none">
        <View style={[styles.box, { backgroundColor: bgColor }]}>
          <ThemedText style={[styles.text, { color: palette.onPrimary }]}>
            {state.text}
          </ThemedText>
        </View>
      </View>
    );
  }, [state, palette]);

  return { show, ToastOverlay };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  box: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    maxWidth: '90%',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
