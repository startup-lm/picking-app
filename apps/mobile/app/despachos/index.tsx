import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Dispatch } from '@/types/db';
import { getDispatches } from '@/lib/repository/dispatches';

const PAGE_SIZE = 25;

export default function DespachosScreen() {
  // filtros y paginación
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // datos y estados de carga
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async (status = statusFilter, dir = sortDir) => {
    try {
      setLoading(true);
      const rows = await getDispatches({ status, orderDir: dir, page: 0, pageSize: PAGE_SIZE });
      setDispatches(rows);
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
      const nextRows = await getDispatches({
        status: statusFilter,
        orderDir: sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setDispatches((prev) => [...prev, ...nextRows]);
      setPage(nextPage);
      setHasMore(nextRows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, statusFilter, sortDir]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const rows = await getDispatches({ status: statusFilter, orderDir: sortDir, page: 0, pageSize: PAGE_SIZE });
      setDispatches(rows);
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
            {(['all', 'pending', 'delivered'] as const).map((st) => {
              const active = statusFilter === st;
              const label = st === 'all' ? 'Todos' : st === 'pending' ? 'Pendiente' : 'Entregado';
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
      {loading && dispatches.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={dispatches}
          keyExtractor={(p) => String(p.id)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : !hasMore && dispatches.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ThemedText style={{ opacity: 0.5, fontSize: 13 }}>
                  Fin de los despachos ({dispatches.length})
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ThemedText>
                  No hay despachos {statusFilter !== 'all' ? `con estado "${statusFilter === 'pending' ? 'Pendiente' : 'Entregado'}"` : ''}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const statusStyle = item.status === 'pending' ? styles.pendiente : styles.entregado;
            return (
              <View style={styles.row}>
                {/* Toda la fila navega al detalle */}
                <Link
                  href={{
                    pathname: '/despachos/[id]',
                    params: { id: String(item.id), client: String(item.client) },
                  }}
                  asChild
                >
                  <Pressable style={styles.rowMain} android_ripple={{ borderless: false }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">
                        #{item.id} - {item.client}
                      </ThemedText>
                      <ThemedText style={styles.sub}>
                        {item.total_package} bultos totales
                      </ThemedText>
                      <ThemedText style={styles.sub}>
                        {item.total_unit} unidades totales
                      </ThemedText>
                    </View>

                    {/* Estado al extremo derecho */}
                    <ThemedText style={[styles.estado, statusStyle]}>
                      {item.status === 'pending' ? 'Pendiente' : 'Entregado'}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            );
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  filterBox: {
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    color: '#374151',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  chipActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#1F2937',
  },
  chipText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  separator: { height: 12 },

  row: {
    position: 'relative',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },

  rowMain: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  sub: { opacity: 0.7, marginTop: 2 },

  estado: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  pendiente: { color: '#C0392B' },
  entregado: { color: '#2E7D32' },
});