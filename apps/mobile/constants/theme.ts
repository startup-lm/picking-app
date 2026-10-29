// constants/theme.ts
import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Header (Stack)
    headerBg:    '#C62828',
    headerTitle: '#FFD600',
    headerTint:  '#FFFFFF',

    // Contenido
    text:        '#111827',
    background:  '#F3F3F3',
    surface:     '#FFFFFF',
    border:      '#BDBDBD',

    // Accentos / estados
    accent:      '#FACC15',
    danger:      '#C0392B',
    success:     '#2E7D32',

    // Compat (template)
    tint:            '#FACC15',
    icon:            '#687076',
  },

  dark: {
    // Mismos colores de header y acentos (si querés cambiar, lo hacés acá)
    headerBg:    '#C62828',
    headerTitle: '#FFD600',
    headerTint:  '#FFFFFF',

    // Si querés mantener texto NEGRO también en dark, lo dejamos igual
    text:        '#111827',
    background:  '#F3F3F3',
    surface:     '#FFFFFF',
    border:      '#BDBDBD',

    accent:      '#FACC15',
    danger:      '#C0392B',
    success:     '#2E7D32',

    // Compat (template)
    tint:            '#FACC15',
    icon:            '#9BA1A6',
  },
};

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
