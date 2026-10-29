import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  visible: boolean;
  label: string;
  loading?: boolean;
  onPress?: () => void;
};

export default function FooterPrimaryAction({ visible, label, loading, onPress }: Props) {
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', left: 20, right: 20, bottom: 36 }}>
      <Pressable
        disabled={loading}
        onPress={onPress}
        style={{
          alignItems: 'center',
          padding: 14,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: '#1F2937',
          backgroundColor: '#F7D54A',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <ThemedText type="defaultSemiBold" style={{ fontWeight: '600' }}>
          {loading ? 'Procesando…' : label}
        </ThemedText>
      </Pressable>
    </View>
  );
}
