import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { BrandingProvider, useBranding } from '@/lib/branding-context';
import { supabase } from '@/lib/supabase/client';
import { initFeedback } from '@/lib/feedback';
import { fetchOwnProfile, isAuthError, signOut, type UserProfile } from '@/lib/session';
import { SessionContext } from '@/lib/session-context';

function RootLayoutNav() {
  const scheme = useColorScheme();
  const palette = usePalette();
  const { appName } = useBranding();
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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    if (session === undefined) return;

    if (!session) {
      setProfile(null);
      return;
    }

    const loadProfile = async (attempt: number) => {
      try {
        const res = await fetchOwnProfile();
        if (!active) return;

        if (res.status === 'ok') {
          if (res.profile.is_active) {
            setProfile(res.profile);
          } else {
            setProfile(null);
            await signOut('inactive');
          }
        } else if (res.status === 'missing') {
          setProfile(null);
          await signOut('inactive');
        } else if (res.status === 'error') {
          if (isAuthError(res.error)) {
            setProfile(null);
            await signOut('expired');
          } else {
            setProfile(null);
            if (attempt < 3) {
              retryTimer = setTimeout(() => {
                if (active) {
                  void loadProfile(attempt + 1);
                }
              }, 5000);
            }
          }
        }
      } catch (err) {
        if (!active) return;
        if (isAuthError(err)) {
          setProfile(null);
          await signOut('expired');
        } else {
          setProfile(null);
          if (attempt < 3) {
            retryTimer = setTimeout(() => {
              if (active) {
                void loadProfile(attempt + 1);
              }
            }, 5000);
          }
        }
      }
    };

    void loadProfile(0);

    return () => {
      active = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
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
          <Stack.Screen name="index" options={{ title: appName.toUpperCase() }} />
          <Stack.Screen
            name="login"
            options={{ title: appName.toUpperCase(), headerBackVisible: false }}
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

export default function RootLayout() {
  return (
    <BrandingProvider>
      <RootLayoutNav />
    </BrandingProvider>
  );
}
