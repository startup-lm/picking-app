// app/despachos/[id].tsx (o la ruta equivalente en tu proyecto)
import React, { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';
import SortTrigger from '@/components/order-detail/SortTrigger';
import SortModal from '@/components/order-detail/SortModal';
import AisleFilter from '@/components/order-detail/AisleFilter';
import StatusFilter from '@/components/order-detail/StatusFilter';
import ProductDispatchItem from '@/components/order-detail/ProductDispatchItem';
import FooterPrimaryAction from '@/components/order-detail/FooterPrimaryAction';

import { computeAisleStats, filterAndSortRows, getPendientes, pendientesResumen } from '@/utils/dispatch-detail';
import { filterByStatus, Statuses } from '@/utils/completion';

import { findProductByBarcode } from '@/lib/repository/products';
import { incrementProductDispatchScanByRowId, decrementProductDispatchScanByRowId } from '@/lib/repository/productDispatch';
import { updateDispatch } from '@/lib/repository/dispatches';
import type { Dispatch, Product, ProductDispatch } from '@/types/db';

import { useDispatchStatus } from '@/hooks/use-dispatch-status';
import { useScannerFlow } from '@/hooks/use-scanner-flows';
import { useToast } from '@/hooks/use-toast';
import { useDispatchDetail } from '@/hooks/use-dispatch-detail';

export default function DespachoDetalleScreen() {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { id, client } = useLocalSearchParams<{ id: string; client: string }>();
  const dispatchId = String(id ?? '');

  // datos (hook con carga + realtime)
  const { rows, setRows, productMap, loading, refreshing, onRefresh } = useDispatchDetail(dispatchId);
  const { status, setStatus } = useDispatchStatus(dispatchId);

  // Filtros visuales
  const [selectedAisle, setSelectedAisle] = useState<'ALL' | string>('ALL');
  const [sortKey, setSortKey] = useState<'location' | 'sku'>('location');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sortOpen, setSortOpen] = useState(false);

  // Nuevo: filtro por estado de escaneo (igual que en pedidos)
  const [statusFilter, setStatusFilter] = useState<Statuses>('all');

  const { show: showToast, ToastOverlay } = useToast();

  // 1) Aplico filtro de estado primero
  const completionFiltered = useMemo(
    () => filterByStatus(rows, statusFilter),
    [rows, statusFilter]
  );

  // 2) Aisles basados en el subconjunto filtrado por estado
  const aisleStats = useMemo(
    () => computeAisleStats(completionFiltered),
    [completionFiltered]
  );

  // 3) Lista final: filtro por pasillo + orden en base al subconjunto
  const list = useMemo(
    () => filterAndSortRows(completionFiltered, selectedAisle, sortKey, sortDir, productMap),
    [completionFiltered, selectedAisle, sortKey, sortDir, productMap]
  );

  // Pendientes (para confirmar)
  const pendientes = useMemo(() => getPendientes(rows), [rows]);
  const allComplete = pendientes.length === 0;
  const isDelivered = String(status) === 'delivered';

  // Escaneo
  const handleCode = useCallback(
    async (rawInput: string): Promise<{ ok: boolean; sku?: string }> => {
      const raw = (rawInput ?? '').trim();
      if (!raw) {
        Alert.alert('Código vacío', 'Ingresá un código válido.');
        return { ok: false };
      }

      const codeNum = Number(raw);
      const isNumeric = !Number.isNaN(codeNum) && raw !== '';
      const rawLower = raw.toLowerCase();

      // 1. Búsqueda instantánea en memoria local (artículos del despacho actual)
      let product: Product | null = null;
      const prodsList: Product[] = Array.from(productMap.values());
      for (const p of prodsList) {
        if (!p) continue;
        if (
          (isNumeric && (Number(p.package_barcode) === codeNum || Number(p.unit_barcode) === codeNum)) ||
          String(p.sku ?? '').trim().toLowerCase() === rawLower
        ) {
          product = p;
          break;
        }
      }

      // 2. Si no se encontró en la memoria local, consultar Supabase (catálogo completo)
      if (!product) {
        product = await findProductByBarcode(raw);
      }

      if (!product) {
        Alert.alert('No encontrado', `No existe artículo para el código: ${raw}`);
        return { ok: false };
      }

      const kind: 'package' | 'unit' =
        isNumeric && Number(product.package_barcode) === codeNum ? 'package'
        : isNumeric && Number(product.unit_barcode) === codeNum ? 'unit'
        : 'unit';

      const candidate = rows.find(r =>
        String(r.product_id) === String(product.id) &&
        (kind === 'package'
          ? (Number(r.package_total) - Number(r.package_scanned)) > 0
          : (Number(r.unit_total)    - Number(r.unit_scanned))  > 0)
      );

      if (!candidate) {
        Alert.alert(
          'Sin pendiente',
          `No hay ${kind === 'package' ? 'bultos' : 'unidades'} pendientes para este producto.`
        );
        return { ok: false };
      }

      if (kind === 'package' && Number(candidate.package_scanned) + 1 > Number(candidate.package_total)) {
        Alert.alert('Límite', 'La cantidad supera los bultos pendientes.');
        return { ok: false };
      }
      if (kind === 'unit' && Number(candidate.unit_scanned) + 1 > Number(candidate.unit_total)) {
        Alert.alert('Límite', 'La cantidad supera las unidades pendientes.');
        return { ok: false };
      }

      // Optimista
      setRows(curr =>
        curr.map(r =>
          r.id === candidate.id
            ? {
                ...r,
                package_scanned: kind === 'package'
                  ? (Number(r.package_scanned) || 0) + 1
                  : (Number(r.package_scanned) || 0),
                unit_scanned: kind === 'unit'
                  ? (Number(r.unit_scanned) || 0) + 1
                  : (Number(r.unit_scanned) || 0),
              }
            : r
        )
      );

      // Persistencia
      const updated = await incrementProductDispatchScanByRowId(candidate.id, kind, 1);
      if (updated) setRows(curr => curr.map(r => (r.id === updated.id ? updated : r)));

      return { ok: true, sku: String(product.sku ?? '') };
    },
    [rows, setRows, productMap]
  );

  const { openScanner, Scanner } = useScannerFlow({
    onCode: async (data) => {
      const { ok, sku } = await handleCode(data);
      if (ok) showToast(`Artículo ${sku ?? ''} escaneado`);
    },
    title: 'Escaneá un código',
  });

  // Confirmar despacho
  const [confirming, setConfirming] = useState(false);
  const handleItemLongPress = useCallback(
    (item: ProductDispatch) => {
      if (isDelivered) return;

      const prod =
        productMap instanceof Map
          ? productMap.get(String(item.product_id))
          : (productMap as Record<number, Product>)[item.product_id];
      const skuLabel = prod?.sku ? `${prod.sku}` : `Artículo #${item.product_id}`;
      const hasPkg = (Number(item.package_scanned) || 0) > 0;
      const hasUnit = (Number(item.unit_scanned) || 0) > 0;

      if (!hasPkg && !hasUnit) {
        Alert.alert('Sin escaneos', 'No hay escaneos para restar en este artículo.');
        return;
      }

      const applyDecrement = async (kind: 'package' | 'unit') => {
        // Optimista
        setRows((curr) =>
          curr.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  package_scanned:
                    kind === 'package'
                      ? Math.max(0, (Number(r.package_scanned) || 0) - 1)
                      : Number(r.package_scanned) || 0,
                  unit_scanned:
                    kind === 'unit'
                      ? Math.max(0, (Number(r.unit_scanned) || 0) - 1)
                      : Number(r.unit_scanned) || 0,
                }
              : r
          )
        );

        const updated = await decrementProductDispatchScanByRowId(item.id, kind, 1);
        if (updated) {
          setRows((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
          showToast(`Se restó 1 ${kind === 'package' ? 'bulto' : 'unidad'} a ${skuLabel}`);
        }
      };

      if (hasPkg && hasUnit) {
        Alert.alert('Descontar escaneo', `¿Qué deseas restar de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restar 1 Bulto', onPress: () => { void applyDecrement('package'); } },
          { text: 'Restar 1 Unidad', onPress: () => { void applyDecrement('unit'); } },
        ]);
      } else if (hasPkg) {
        Alert.alert('Descontar escaneo', `¿Deseas restar 1 bulto escaneado de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restar', style: 'destructive', onPress: () => { void applyDecrement('package'); } },
        ]);
      } else {
        Alert.alert('Descontar escaneo', `¿Deseas restar 1 unidad escaneada de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Restar', style: 'destructive', onPress: () => { void applyDecrement('unit'); } },
        ]);
      }
    },
    [isDelivered, productMap, setRows, showToast]
  );

  const onConfirmDispatch = useCallback(async () => {
    if (!allComplete) {
      Alert.alert('Faltan productos por escanear', pendientesResumen(pendientes, productMap));
      return;
    }
    try {
      setConfirming(true);
      const updated = await updateDispatch(Number(dispatchId), { status: 'delivered' as Dispatch['status'] });
      if (updated) {
        setStatus('delivered');
        router.back();
      }
    } finally {
      setConfirming(false);
    }
  }, [allComplete, pendientes, productMap, dispatchId, setStatus]);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const showPrimary   = !isDelivered;
  const primaryLabel  = allComplete ? 'CONFIRMAR DESPACHO' : 'ESCANEAR';
  const onPrimaryPress = allComplete ? onConfirmDispatch : openScanner;
  const primaryLoading = allComplete ? confirming : false;

  return (
    <ThemedView style={{ flex: 1, padding: 20, gap: 12 }}>
      <Stack.Screen options={{ title: `Despacho #${dispatchId} - ${client}` }} />

      {/* Filtros */}
      <ThemedView style={styles.filterBox}>
        <SortTrigger sortKey={sortKey} sortDir={sortDir} onOpen={() => setSortOpen(true)} />
        <StatusFilter status={statusFilter} onChange={setStatusFilter} />
        <AisleFilter stats={aisleStats} selected={selectedAisle} onSelect={setSelectedAisle} />
      </ThemedView>

      {/* Lista */}
      <FlatList
        data={list}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <ProductDispatchItem
            item={item}
            productMap={productMap}
            onLongPress={handleItemLongPress}
          />
        )}
      />

      {/* Acción principal */}
      <FooterPrimaryAction
        visible={showPrimary}
        label={primaryLabel}
        loading={primaryLoading}
        onPress={onPrimaryPress}
      />

      {/* Modal ordenar */}
      <SortModal
        visible={sortOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onClose={() => setSortOpen(false)}
        onApply={(k, d) => {
          setSortKey(k);
          setSortDir(d);
          setSortOpen(false);
        }}
      />

      {/* Scanner (modal) */}
      <Scanner />

      {/* Toast overlay */}
      <ToastOverlay />
    </ThemedView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    filterBox: {
      backgroundColor: p.surfaceAlt,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: p.borderSoft,
    },
  });
