import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { APP_NAME } from '@/constants/brand';
import { supabase } from '@/lib/supabase/client';
import { initFeedback } from '@/lib/feedback';
import { fetchOwnProfile, signOut, type UserProfile } from '@/lib/session';
import { SessionContext } from '@/lib/session-context';

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme ?? 'light'];
  const segments = useSegments();
  const router = useRouter();

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    initFeedback();
  }, []);

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
    let active = true;

    if (session === undefined) return;

    if (!session) {
      setProfile(null);
      return;
    }

    fetchOwnProfile()
      .then(async (p) => {
        if (!active) return;
        if (!p || !p.is_active) {
          setProfile(null);
          await signOut('inactive');
        } else {
          setProfile(p);
        }
      })
      .catch(async () => {
        if (!active) return;
        setProfile(null);
        await signOut('inactive');
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (session === undefined) return;
    const inLogin = segments[0] === 'login';

    if (!session && !inLogin) {
      router.replace('/login');
    } else if (session && profile && inLogin) {
      router.replace('/');
    }
  }, [session, profile, segments, router]);

  return (
    <SessionContext.Provider value={{ profile }}>
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
    </SessionContext.Provider>
  );
}
