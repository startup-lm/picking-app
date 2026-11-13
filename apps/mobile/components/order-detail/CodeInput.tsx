import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';

type Props = {
  onSubmitCode: (code: string) => Promise<unknown> | void;
  disabled?: boolean;
};

export default function CodeInput({ onSubmitCode, disabled = false }: Props) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [manualText, setManualText] = useState('');
  const [btText, setBtText] = useState('');

  const btInputRef = useRef<TextInput | null>(null);
  const manualFocusedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const handleManualSubmit = () => {
    if (disabled) return;
    const toSend = manualText.trim();
    if (toSend) {
      setManualText('');
      void onSubmitCode(toSend);
    }
  };

  const handleBtSubmit = () => {
    if (disabled) return;
    const toSend = btText.trim();
    setBtText('');
    if (toSend) {
      void onSubmitCode(toSend);
    }
  };

  return (
    <View style={styles.container}>
      {/* Input oculto para lector Bluetooth (modo teclado) */}
      <TextInput
        ref={btInputRef}
        style={styles.hiddenInput}
        autoFocus={!disabled}
        showSoftInputOnFocus={false}
        blurOnSubmit={false}
        value={btText}
        onChangeText={setBtText}
        onSubmitEditing={handleBtSubmit}
        onBlur={() => {
          if (!disabled && !manualFocusedRef.current) {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => {
              btInputRef.current?.focus();
            }, 100);
          }
        }}
        editable={!disabled}
      />

      {/* Input visible para carga manual */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder="Código manual"
          placeholderTextColor={palette.textMuted}
          value={manualText}
          onChangeText={setManualText}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!disabled}
          onFocus={() => {
            manualFocusedRef.current = true;
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          }}
          onBlur={() => {
            manualFocusedRef.current = false;
            if (!disabled) {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              blurTimerRef.current = setTimeout(() => {
                btInputRef.current?.focus();
              }, 100);
            }
          }}
          onSubmitEditing={handleManualSubmit}
        />

        <Pressable
          style={[
            styles.submitButton,
            (disabled || !manualText.trim()) && styles.submitButtonDisabled,
          ]}
          onPress={handleManualSubmit}
          disabled={disabled || !manualText.trim()}
          android_ripple={{ color: palette.borderSoft }}
        >
          <ThemedText style={styles.submitButtonText}>OK</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: {
      position: 'relative',
    },
    hiddenInput: {
      width: 0,
      height: 0,
      opacity: 0,
      position: 'absolute',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      backgroundColor: p.surface,
      color: p.text,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    inputDisabled: {
      opacity: 0.5,
      backgroundColor: p.surfaceAlt,
    },
    submitButton: {
      height: 48,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: p.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
  });
