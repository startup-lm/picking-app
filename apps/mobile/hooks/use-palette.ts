import { useColorScheme } from 'react-native';
import { Colors, type Palette } from '@/constants/theme';
import { useBranding } from '@/lib/branding-context';

export function usePalette(): Palette {
  const scheme = useColorScheme() ?? 'light';
  const base = Colors[scheme];
  const { primaryColor, accentColor } = useBranding();

  if (scheme === 'dark') {
    return {
      ...base,
      accent: accentColor,
    };
  }

  return {
    ...base,
    primary: primaryColor,
    headerBg: primaryColor,
    tint: primaryColor,
    accent: accentColor,
  };
}
