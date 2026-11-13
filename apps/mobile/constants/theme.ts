// constants/theme.ts
import { Platform } from 'react-native';

export const Colors = {
  light: {
    headerBg: '#0F4C5C',
    headerTitle: '#FFFFFF',
    headerTint: '#FFFFFF',
    primary: '#0F4C5C',
    onPrimary: '#FFFFFF',
    accent: '#F2A541',
    accentSoft: '#FCE7C8',
    onAccent: '#111827',
    text: '#111827',
    textMuted: '#4B5563',
    background: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceAlt: '#E5E7EB',
    border: '#BDBDBD',
    borderSoft: '#E5E7EB',
    danger: '#C0392B',
    success: '#2E7D32',
    tint: '#0F4C5C',
    icon: '#687076',
  },
  dark: {
    headerBg: '#0A3540',
    headerTitle: '#FFFFFF',
    headerTint: '#FFFFFF',
    primary: '#5FB3C7',
    onPrimary: '#000000',
    accent: '#F2A541',
    accentSoft: '#4A3415',
    onAccent: '#000000',
    text: '#F9FAFB',
    textMuted: '#D1D5DB',
    background: '#000000',
    surface: '#111827',
    surfaceAlt: '#1F2937',
    border: '#6B7280',
    borderSoft: '#374151',
    danger: '#FF6B5B',
    success: '#4ADE80',
    tint: '#5FB3C7',
    icon: '#D1D5DB',
  },
};

export type Palette = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
