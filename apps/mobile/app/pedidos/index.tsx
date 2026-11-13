import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ButtonOptions from '@/components/ui/button-options';
import MenuOptions from '@/components/ui/menu-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Palette } from '@/constants/theme';
import type { Order } from '@/types/db';
import { getOrders } from '@/lib/repository/orders';
import { generateOrderPdfFromDb } from '@/lib/print/printOrder';
import { openOrSharePdf } from '@/lib/print/openPDF';

const PAGE_SIZE = 25;

export default function PedidosScreen() {
  const palette = Colors[useColorScheme() ?? 'light'];
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // menú contextual
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number }>();
  const anchorRefs = useRef(new Map<number, View>());

  // confirmación (solo imprimir)
  const [confirm, setConfirm] = useState<{
    visible: boolean;
    kind: 'print' | null;
    pedido?: Order;
  }>({ visible: false, kind: null, pedido: undefined });

  const openConfirm = (pedido: Order) =>
    setConfirm({ visible: true, kind: 'print', pedido });

  const closeConfirm = () => setConfirm((prev) => ({ ...prev, visible: false }));

  const handleConfirm = async () => {
    if (confirm.kind === 'print' && confirm.pedido) {
      const { uri } = await generateOrderPdfFromDb(confirm.pedido);
      await openOrSharePdf(uri);
    }
    closeConfirm();
  };

  // filtros y paginación
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assembled'>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // datos y estados de carga
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async (status = statusFilter, dir = sortDir) => {
    try {
      setLoading(true);
      const rows = await getOrders({ status, orderDir: dir, page: 0, pageSize: PAGE_SIZE });
      setOrders(rows);
      setPage(0);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortDir]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const nextRows = await getOrders({
        status: statusFilter,
        orderDir: sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setOrders((prev) => [...prev, ...nextRows]);
      setPage(nextPage);
      setHasMore(nextRows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, statusFilter, sortDir]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const rows = await getOrders({ status: statusFilter, orderDir: sortDir, page: 0, pageSize: PAGE_SIZE });
      setOrders(rows);
      setPage(0);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setRefreshing(false);
    }
  }, [statusFilter, sortDir]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  return (
    <ThemedView style={styles.container}>
      {/* FILTROS DE ESTADO Y ORDEN */}
      <ThemedView style={styles.filterBox}>
        <View style={styles.filterRow}>
          <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
            Estado:
          </ThemedText>
          <View style={styles.pillsRow}>
            {(['all', 'pending', 'assembled'] as const).map((st) => {
              const active = statusFilter === st;
              const label = st === 'all' ? 'Todos' : st === 'pending' ? 'Pendiente' : 'Armado';
              return (
                <Pressable
                  key={st}
                  onPress={() => setStatusFilter(st)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filterRow}>
          <ThemedText type="defaultSemiBold" style={styles.filterLabel}>
            Orden:
          </ThemedText>
          <View style={styles.pillsRow}>
            <Pressable
              onPress={() => setSortDir('desc')}
              style={[styles.chip, sortDir === 'desc' && styles.chipActive]}
            >
              <ThemedText style={[styles.chipText, sortDir === 'desc' && styles.chipTextActive]}>
                Más recientes ↓
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSortDir('asc')}
              style={[styles.chip, sortDir === 'asc' && styles.chipActive]}
            >
              <ThemedText style={[styles.chipText, sortDir === 'asc' && styles.chipTextActive]}>
                Más antiguos ↑
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>

      {/* CONTENIDO PRINCIPAL */}
      {loading && orders.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(p) => String(p.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScrollBeginDrag={() => setMenuFor(null)}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : !hasMore && orders.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ThemedText style={{ opacity: 0.5, fontSize: 13 }}>
                  Fin de los pedidos ({orders.length})
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ThemedText>
                  No hay pedidos {statusFilter !== 'all' ? `con estado "${statusFilter === 'pending' ? 'Pendiente' : 'Armado'}"` : ''}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const statusStyle = item.status === 'pending' ? styles.pendiente : styles.completado;

            return (
              <View style={styles.row}>
                {/* principal */}
                <Link
                  href={{ pathname: '/pedidos/[id]', params: { id: String(item.id), client: String(item.client) } }}
                  asChild
                >
                  <Pressable style={styles.rowMain} android_ripple={{ borderless: false }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">
                        #{item.id} - {item.client}
                      </ThemedText>
                      <ThemedText style={styles.sub}>{item.total_package} bultos totales</ThemedText>
                      <ThemedText style={styles.sub}>{item.total_unit} unidades totales</ThemedText>
                    </View>
                  </Pressable>
                </Link>

                {/* estado */}
                <ThemedText style={[styles.estado, statusStyle]}>
                  {item.status === 'pending' ? 'Pendiente' : 'Armado'}
                </ThemedText>

                {/* botón opciones (ancla medible) */}
                <View
                  ref={(v) => { if (v) anchorRefs.current.set(item.id, v); }}
                  style={styles.moreBox}
                >
                  <ButtonOptions
                    onPress={() => {
                      if (menuFor === item.id) {
                        setMenuFor(null);
                        return;
                      }
                      const v = anchorRefs.current.get(item.id);
                      if (v) {
                        v.measureInWindow((x, y, w, h) => {
                          setAnchor({ x, y, w, h });
                          setMenuFor(item.id);
                        });
                      } else {
                        setAnchor(undefined);
                        setMenuFor(item.id);
                      }
                    }}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Confirmación (solo imprimir) */}
      {confirm.visible && (
        <ConfirmDialog
          visible
          message={`¿Querés imprimir el pedido #${confirm.pedido?.id ?? ''}?`}
          cancelLabel="Cancelar"
          confirmLabel="Imprimir"
          onCancel={closeConfirm}
          onConfirm={handleConfirm}
        />
      )}

      {/* Único menú overlay (fuera del FlatList) */}
      <MenuOptions
        visible={menuFor !== null}
        anchor={anchor}
        onClose={() => setMenuFor(null)}
        onViewDetail={() => {
          const row = orders.find(o => o.id === menuFor!);
          if (!row) return;
          router.push({ pathname: '/pedidos/[id]', params: { id: String(row.id), client: String(row.client) } });
        }}
        onPrint={() => {
          const row = orders.find(o => o.id === menuFor!);
          if (row) openConfirm(row);
        }}
      />
    </ThemedView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12 },
    filterBox: {
      backgroundColor: p.surfaceAlt,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: p.borderSoft,
      gap: 8,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterLabel: {
      color: p.text,
      fontSize: 13,
      width: 52,
    },
    pillsRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      flex: 1,
    },
    chip: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.borderSoft,
    },
    chipActive: {
      backgroundColor: p.accentSoft,
      borderColor: p.accent,
    },
    chipText: {
      color: p.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    chipTextActive: {
      color: p.text,
      fontWeight: '700',
    },
    separator: { height: 12 },
    row: {
      position: 'relative',
      borderRadius: 8,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.borderSoft,
      overflow: 'visible',
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowMain: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    sub: { opacity: 0.7, marginTop: 2 },
    estado: { fontSize: 16, fontWeight: '600', marginRight: 8 },
    pendiente: { color: p.danger },
    completado: { color: p.success },
    moreBox: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: 8,
      paddingLeft: 4,
    },
  });
