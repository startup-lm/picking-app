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
import OrderLineItem from '@/components/order-detail/OrderLineItem';
import NextLocationCard from '@/components/order-detail/NextLocationCard';
import CodeInput from '@/components/order-detail/CodeInput';
import FooterPrimaryAction from '@/components/order-detail/FooterPrimaryAction';
import {
  computeAisleStats,
  filterAndSortRows,
  getPendientes,
  nextLine,
} from '@/utils/order-detail';
import { filterByStatus, type Statuses } from '@/utils/completion';
import { remaining, progressOf } from '@/utils/progress';
import { findLineByCode, scanLine, completeOrder } from '@/lib/repository/scan';
import { STAGE_STATUSES, type OrderDetailLine } from '@/lib/repository/orders';
import { errorMessage, handleError } from '@/lib/errors';
import { feedback } from '@/lib/feedback';
import type { Stage, ScanKind } from '@/types/rpc';
import { useScannerFlow } from '@/hooks/use-scanner-flows';
import { useToast } from '@/hooks/use-toast';
import { useOrderDetail } from '@/hooks/use-order-detail';

export default function OrdenDetalleScreen() {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const params = useLocalSearchParams<{ id: string; stage?: string }>();
  const orderId = Number(params.id);
  const stage: Stage = params.stage === 'dispatch' ? 'dispatch' : 'picking';

  const { order, lines, setLines, loading, refreshing, onRefresh } = useOrderDetail(orderId);

  // Filtros
  const [selectedAisle, setSelectedAisle] = useState<'ALL' | string>('ALL');
  const [sortKey, setSortKey] = useState<'location' | 'sku'>('location');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [sortOpen, setSortOpen] = useState(false);

  // Filtro por estado de escaneo
  const [statusFilter, setStatusFilter] = useState<Statuses>('all');

  const { show: showToast, ToastOverlay } = useToast();

  // Aplico filtro de estado primero
  const completionFiltered = useMemo(
    () => filterByStatus(lines, statusFilter, stage),
    [lines, statusFilter, stage]
  );

  // Aisles en base al subconjunto filtrado por estado
  const aisleStats = useMemo(
    () => computeAisleStats(completionFiltered, stage),
    [completionFiltered, stage]
  );

  // Lista final: aisles + orden
  const list = useMemo(
    () => filterAndSortRows(completionFiltered, selectedAisle, sortKey, sortDir),
    [completionFiltered, selectedAisle, sortKey, sortDir]
  );

  const pendientes = useMemo(() => getPendientes(lines, stage), [lines, stage]);
  const allComplete = pendientes.length === 0;
  const isStageActive = order ? STAGE_STATUSES[stage].includes(order.status) : false;

  // Siguiente ubicación a recorrer
  const nextItem = useMemo(() => nextLine(lines, stage), [lines, stage]);

  const handleCode = useCallback(
    async (rawInput: string): Promise<{ ok: boolean; message: string }> => {
      const code = (rawInput ?? '').trim();
      if (!code) return { ok: false, message: 'Código vacío' };

      let found;
      try {
        found = await findLineByCode(orderId, code);
      } catch (e) {
        const message = await handleError(e);
        await feedback('error');
        showToast(message, 'error');
        return { ok: false, message };
      }

      const line = lines.find((l) => l.id === found.line.id);
      if (!line) {
        const message = errorMessage('not_in_order');
        await feedback('error');
        showToast(message, 'error');
        return { ok: false, message };
      }

      if (remaining(line, stage, found.kind) <= 0) {
        const message = errorMessage('out_of_range');
        await feedback('error');
        showToast(message, 'error');
        return { ok: false, message };
      }

      // Snapshot para revertir en error
      const prevLine = { ...line };

      // Optimista: sumando 1 al contador de esa etapa y tipo
      setLines((curr) =>
        curr.map((l) => {
          if (l.id !== line.id) return l;
          if (stage === 'picking') {
            return {
              ...l,
              package_scanned:
                found.kind === 'package' ? l.package_scanned + 1 : l.package_scanned,
              unit_scanned: found.kind === 'unit' ? l.unit_scanned + 1 : l.unit_scanned,
            };
          } else {
            return {
              ...l,
              package_checked:
                found.kind === 'package' ? l.package_checked + 1 : l.package_checked,
              unit_checked: found.kind === 'unit' ? l.unit_checked + 1 : l.unit_checked,
            };
          }
        })
      );

      try {
        const res = await scanLine({
          lineId: line.id,
          stage,
          kind: found.kind,
          delta: 1,
          code,
        });

        // Éxito: reemplazar los contadores de la línea con res.line
        setLines((curr) =>
          curr.map((l) => {
            if (l.id !== res.line.id) return l;
            return {
              ...l,
              package_scanned: res.line.package_scanned,
              unit_scanned: res.line.unit_scanned,
              package_checked: res.line.package_checked,
              unit_checked: res.line.unit_checked,
            };
          })
        );

        const total = found.kind === 'package' ? res.line.package_total : res.line.unit_total;
        const done =
          found.kind === 'package'
            ? stage === 'picking'
              ? res.line.package_scanned
              : res.line.package_checked
            : stage === 'picking'
            ? res.line.unit_scanned
            : res.line.unit_checked;
        const kindLabel = found.kind === 'package' ? 'bultos' : 'unidades';
        const message = `${found.product.sku} · ${kindLabel} ${done}/${total}`;

        await feedback('success');
        showToast(message, 'success');
        return { ok: true, message };
      } catch (e) {
        // Error: revertir el +1 (volver a los contadores anteriores)
        setLines((curr) =>
          curr.map((l) => {
            if (l.id !== line.id) return l;
            return {
              ...l,
              package_scanned: prevLine.package_scanned,
              unit_scanned: prevLine.unit_scanned,
              package_checked: prevLine.package_checked,
              unit_checked: prevLine.unit_checked,
            };
          })
        );
        const message = await handleError(e);
        await feedback('error');
        showToast(message, 'error');
        return { ok: false, message };
      }
    },
    [lines, orderId, setLines, showToast, stage]
  );

  const { openScanner, Scanner, submitCode } = useScannerFlow({
    onCode: handleCode,
    title: 'Escaneá un código',
  });

  const [confirming, setConfirming] = useState(false);

  const handleItemLongPress = useCallback(
    (item: OrderDetailLine) => {
      if (!order || !STAGE_STATUSES[stage].includes(order.status)) return;

      const progress = progressOf(item, stage);
      const hasPkg = progress.pkgDone > 0;
      const hasUnit = progress.unitDone > 0;

      if (!hasPkg && !hasUnit) {
        void feedback('warning');
        showToast('No hay escaneos para restar en este artículo.', 'error');
        return;
      }

      const applyDecrement = async (kind: ScanKind) => {
        const prevLine = { ...item };

        // Optimista: restar 1
        setLines((curr) =>
          curr.map((l) => {
            if (l.id !== item.id) return l;
            if (stage === 'picking') {
              return {
                ...l,
                package_scanned:
                  kind === 'package' ? Math.max(0, l.package_scanned - 1) : l.package_scanned,
                unit_scanned:
                  kind === 'unit' ? Math.max(0, l.unit_scanned - 1) : l.unit_scanned,
              };
            } else {
              return {
                ...l,
                package_checked:
                  kind === 'package' ? Math.max(0, l.package_checked - 1) : l.package_checked,
                unit_checked:
                  kind === 'unit' ? Math.max(0, l.unit_checked - 1) : l.unit_checked,
              };
            }
          })
        );

        try {
          const res = await scanLine({
            lineId: item.id,
            stage,
            kind,
            delta: -1,
          });

          setLines((curr) =>
            curr.map((l) => {
              if (l.id !== res.line.id) return l;
              return {
                ...l,
                package_scanned: res.line.package_scanned,
                unit_scanned: res.line.unit_scanned,
                package_checked: res.line.package_checked,
                unit_checked: res.line.unit_checked,
              };
            })
          );
          await feedback('success');
          showToast(
            `Se restó 1 ${kind === 'package' ? 'bulto' : 'unidad'} a ${item.product.sku}`,
            'success'
          );
        } catch (e) {
          // Revertir
          setLines((curr) =>
            curr.map((l) => {
              if (l.id !== item.id) return l;
              return {
                ...l,
                package_scanned: prevLine.package_scanned,
                unit_scanned: prevLine.unit_scanned,
                package_checked: prevLine.package_checked,
                unit_checked: prevLine.unit_checked,
              };
            })
          );
          const message = await handleError(e);
          await feedback('error');
          showToast(message, 'error');
        }
      };

      const skuLabel = item.product.sku;
      if (hasPkg && hasUnit) {
        Alert.alert('Descontar escaneo', `¿Qué deseas restar de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restar 1 Bulto',
            onPress: () => {
              void applyDecrement('package');
            },
          },
          {
            text: 'Restar 1 Unidad',
            onPress: () => {
              void applyDecrement('unit');
            },
          },
        ]);
      } else if (hasPkg) {
        Alert.alert('Descontar escaneo', `¿Deseas restar 1 bulto escaneado de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restar',
            style: 'destructive',
            onPress: () => {
              void applyDecrement('package');
            },
          },
        ]);
      } else {
        Alert.alert('Descontar escaneo', `¿Deseas restar 1 unidad escaneada de ${skuLabel}?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restar',
            style: 'destructive',
            onPress: () => {
              void applyDecrement('unit');
            },
          },
        ]);
      }
    },
    [order, setLines, showToast, stage]
  );

  const onConfirm = useCallback(async () => {
    if (!allComplete) {
      await feedback('error');
      showToast('Faltan productos por escanear', 'error');
      return;
    }
    try {
      setConfirming(true);
      await completeOrder(orderId, stage);
      await feedback('success');
      const action = stage === 'picking' ? 'armado' : 'despachado';
      showToast(`Pedido ${order?.order_number ?? ''} ${action}`, 'success');
      router.back();
    } catch (e) {
      const message = await handleError(e);
      await feedback('error');
      showToast(message, 'error');
    } finally {
      setConfirming(false);
    }
  }, [allComplete, order?.order_number, orderId, showToast, stage]);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const showPrimary = isStageActive;
  const primaryLabel = allComplete
    ? stage === 'picking'
      ? 'CONFIRMAR PEDIDO'
      : 'CONFIRMAR DESPACHO'
    : 'ESCANEAR';
  const onPrimaryPress = allComplete ? onConfirm : openScanner;
  const primaryLoading = allComplete ? confirming : false;

  const headerTitle =
    stage === 'picking'
      ? `Pedido ${order?.order_number ?? ''} - ${order?.customer_name ?? ''}`
      : `Despacho ${order?.order_number ?? ''} - ${order?.customer_name ?? ''}`;

  return (
    <ThemedView style={{ flex: 1, padding: 20, gap: 12 }}>
      <Stack.Screen options={{ title: headerTitle }} />

      {/* SIGUIENTE UBICACIÓN */}
      <NextLocationCard line={nextItem} stage={stage} />

      {/* INPUT MANUAL / BLUETOOTH */}
      <CodeInput onSubmitCode={submitCode} disabled={!isStageActive} />

      {/* FILTROS */}
      <ThemedView style={styles.filterBox}>
        <SortTrigger sortKey={sortKey} sortDir={sortDir} onOpen={() => setSortOpen(true)} />
        <StatusFilter status={statusFilter} onChange={setStatusFilter} />
        <AisleFilter stats={aisleStats} selected={selectedAisle} onSelect={setSelectedAisle} />
      </ThemedView>

      {/* LISTA */}
      <FlatList
        data={list}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <OrderLineItem
            line={item}
            stage={stage}
            onLongPress={handleItemLongPress}
          />
        )}
      />

      {/* ACCIÓN PRINCIPAL */}
      <FooterPrimaryAction
        visible={showPrimary}
        label={primaryLabel}
        loading={primaryLoading}
        onPress={onPrimaryPress}
      />

      {/* MODALES */}
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
      <Scanner />

      {/* Toast */}
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
