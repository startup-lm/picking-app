import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

const CONTROL_HEIGHT = 44;

type Props = {
  visible: boolean;
  sortKey: 'location' | 'sku';
  sortDir: 'asc' | 'desc';
  onClose: () => void;
  onApply: (key: 'location' | 'sku', dir: 'asc' | 'desc') => void;
};

export default function SortModal({ visible, sortKey, sortDir, onClose, onApply }: Props) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [tmpKey, setTmpKey] = useState<typeof sortKey>(sortKey);
  const [tmpDir, setTmpDir] = useState<typeof sortDir>(sortDir);

  useEffect(() => { if (visible) { setTmpKey(sortKey); setTmpDir(sortDir); } }, [visible, sortKey, sortDir]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 24, textAlign: 'center', marginBottom: 12 }}>
            Ordenar lista
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={{ marginTop: 4 }}>Campo</ThemedText>
          <View style={styles.choiceRow}>
            <Pressable onPress={() => setTmpKey('location')} style={[styles.choiceBtn, tmpKey === 'location' && styles.choiceActive]}>
              <ThemedText>Ubicación</ThemedText>
            </Pressable>
            <Pressable onPress={() => setTmpKey('sku')} style={[styles.choiceBtn, tmpKey === 'sku' && styles.choiceActive]}>
              <ThemedText>Artículo</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="defaultSemiBold" style={{ marginTop: 10 }}>Dirección</ThemedText>
          <View style={styles.choiceRow}>
            <Pressable onPress={() => setTmpDir('asc')} style={[styles.choiceBtn, tmpDir === 'asc' && styles.choiceActive]}>
              <ThemedText>A → Z</ThemedText>
            </Pressable>
            <Pressable onPress={() => setTmpDir('desc')} style={[styles.choiceBtn, tmpDir === 'desc' && styles.choiceActive]}>
              <ThemedText>Z → A</ThemedText>
            </Pressable>
          </View>

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.actionBtn, styles.cancelBtn]}>
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            <Pressable onPress={() => onApply(tmpKey, tmpDir)} style={[styles.actionBtn, styles.okBtn]}>
              <ThemedText type="defaultSemiBold">Aplicar</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalCard: {
      width: '100%', maxWidth: 420, backgroundColor: p.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: p.borderSoft,
    },
    choiceRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    choiceBtn: {
      flex: 1, height: CONTROL_HEIGHT, borderWidth: 1, borderColor: p.borderSoft, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface,
    },
    choiceActive: { backgroundColor: p.accentSoft, borderColor: p.accent },
    modalActions: { marginTop: 34, flexDirection: 'row', justifyContent: 'center', gap: 10 },
    actionBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: p.borderSoft },
    cancelBtn: { backgroundColor: p.surfaceAlt },
    okBtn: { backgroundColor: p.accent },
  });
