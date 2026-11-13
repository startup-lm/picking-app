import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { APP_NAME } from '@/constants/brand';

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme ?? 'light'];

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.headerBg },
          headerTitleStyle: { color: palette.headerTitle, fontWeight: '700' },
          headerTintColor: palette.headerTint,
          contentStyle: { backgroundColor: palette.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ title: APP_NAME.toUpperCase() }} />
        <Stack.Screen name="pedidos/index" options={{ title: 'PEDIDOS' }} />
        <Stack.Screen name="pedidos/[id]" options={{ title: 'PEDIDO' }} />
        <Stack.Screen name="despachos/index" options={{ title: 'DESPACHOS' }} />
        <Stack.Screen name="despachos/[id]" options={{ title: 'DESPACHO' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
