import { useMemo } from 'react';
import { Alert, Image, StyleSheet, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useBranding } from '@/lib/branding-context';
import { useSession } from '@/lib/session-context';
import { signOut } from '@/lib/session';

export default function HomeScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { profile } = useSession();
  const { appName, logoUrl } = useBranding();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={appName}
          />
        ) : (
          <ThemedText type="title" style={styles.brandTitle}>
            {appName}
          </ThemedText>
        )}
        <ThemedText type="subtitle" style={styles.greeting}>
          Hola, {profile?.name ?? 'operario'}
        </ThemedText>
      </View>

      <View style={styles.menu}>
        <Link href="/pedidos" asChild>
          <Pressable style={styles.card} android_ripple={{ borderless: false }}>
            <ThemedText style={styles.cardText}>PREPARAR</ThemedText>
          </Pressable>
        </Link>

        <Link href="/despachos" asChild>
          <Pressable style={styles.card} android_ripple={{ borderless: false }}>
            <ThemedText style={styles.cardText}>DESPACHAR</ThemedText>
          </Pressable>
        </Link>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={handleSignOut}
        android_ripple={{ color: palette.borderSoft }}
      >
        <ThemedText style={styles.logoutButtonText}>CERRAR SESIÓN</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'space-between',
    },
    header: {
      paddingTop: 10,
      alignItems: 'center',
    },
    logo: {
      height: 48,
      width: 180,
      marginBottom: 12,
    },
    brandTitle: {
      color: p.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    greeting: {
      color: p.text,
      textAlign: 'center',
    },
    menu: {
      gap: 30,
    },
    card: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 24,
      alignItems: 'center',
      backgroundColor: p.surface,
      borderColor: p.borderSoft,
    },
    cardText: {
      fontSize: 18,
      fontWeight: '700',
      color: p.text,
    },
    logoutButton: {
      borderWidth: 1,
      borderColor: p.danger,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: p.surface,
      marginBottom: 20,
    },
    logoutButtonText: {
      color: p.danger,
      fontSize: 15,
      fontWeight: '700',
    },
  });
