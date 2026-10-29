import React, { useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export function useToast() {
  const [state, setState] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: '',
  });

  const show = (text: string, ms = 1500) => {
    setState({ visible: true, text });
    setTimeout(() => setState({ visible: false, text: '' }), ms);
  };

  const ToastOverlay = () =>
    state.visible ? (
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          right: 20,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#111827',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
            opacity: 0.95,
          }}
        >
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
            {state.text}
          </ThemedText>
        </View>
      </View>
    ) : null;

  return { show, ToastOverlay };
}
