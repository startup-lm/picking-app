import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePalette } from '@/hooks/use-palette';

type Props = {
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export default function ButtonOptions({ onPress, size = 22, color, style, accessibilityLabel = 'Abrir menú', }: Props) {
  const palette = usePalette();
  const iconColor = color ?? palette.text;
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.btn, style]} accessibilityRole="button" accessibilityLabel={accessibilityLabel} >
      <MaterialIcons name="more-vert" size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 6, borderRadius: 8 },
});
