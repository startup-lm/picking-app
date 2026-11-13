import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { APP_NAME } from '@/constants/brand';
import { supabase } from '@/lib/supabase/client';

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme ?? 'light'];
  const segments = useSegments();
  const router = useRouter();

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    const inLogin = segments[0] === 'login';
    if (!session && !inLogin) {
      router.replace('/login');
    } else if (session && inLogin) {
      router.replace('/');
    }
  }, [session, segments, router]);

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
        <Stack.Screen
          name="login"
          options={{ title: APP_NAME.toUpperCase(), headerBackVisible: false }}
        />
        <Stack.Screen name="pedidos/index" options={{ title: 'PREPARAR' }} />
        <Stack.Screen name="despachos/index" options={{ title: 'DESPACHAR' }} />
        <Stack.Screen name="orden/[id]" options={{ title: 'PEDIDO' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
