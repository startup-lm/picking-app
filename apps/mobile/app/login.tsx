import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { useBranding } from '@/lib/branding-context';
import { supabase } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/errors';
import { consumeSignOutReason } from '@/lib/session';

export default function LoginScreen() {
  const palette = usePalette();
  const { appName, logoUrl } = useBranding();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = consumeSignOutReason();
    if (reason === 'inactive') {
      setWarning('Tu usuario está inactivo. Pedile al administrador que lo active.');
    } else if (reason === 'expired') {
      setWarning('La sesión venció. Volvé a ingresar.');
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email o contraseña incorrectos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const msg = authError.message ?? '';
        if (
          msg.includes('Invalid login credentials') ||
          msg.includes('invalid_credentials')
        ) {
          setError('Email o contraseña incorrectos');
        } else {
          setError(errorMessage(authError));
        }
        return;
      }

      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.card}>
          <View style={styles.brandingHeader}>
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
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            Iniciar sesión
          </ThemedText>

          {warning ? (
            <View style={styles.warningBox}>
              <ThemedText style={styles.warningText}>
                {warning}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              placeholder="operador@ejemplo.com"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Contraseña</ThemedText>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            android_ripple={{ color: palette.borderSoft }}
          >
            {loading ? (
              <ActivityIndicator color={palette.onPrimary} />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                INGRESAR
              </ThemedText>
            )}
          </Pressable>

          {error ? (
            <ThemedText style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    inner: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    card: {
      backgroundColor: p.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.borderSoft,
      padding: 24,
      gap: 16,
    },
    brandingHeader: {
      alignItems: 'center',
      marginBottom: 4,
    },
    logo: {
      height: 48,
      width: 180,
    },
    brandTitle: {
      color: p.text,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '700',
    },
    title: {
      textAlign: 'center',
      marginBottom: 8,
      color: p.text,
    },
    warningBox: {
      borderWidth: 1,
      borderColor: p.danger,
      borderRadius: 8,
      padding: 12,
      backgroundColor: p.surfaceAlt,
    },
    warningText: {
      color: p.danger,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: p.text,
    },
    input: {
      height: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: p.border,
      backgroundColor: p.background,
      color: p.text,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    button: {
      height: 48,
      borderRadius: 8,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: p.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    errorText: {
      color: p.danger,
      textAlign: 'center',
      fontSize: 14,
      marginTop: 4,
    },
  });
