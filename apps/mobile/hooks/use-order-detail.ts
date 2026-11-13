import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { getOrderDetail, type OrderDetail, type OrderDetailLine } from '@/lib/repository/orders';
import { errorMessage } from '@/lib/errors';
import type { OrderStatus } from '@/types/rpc';

export function useOrderDetail(orderId: number) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [lines, setLines] = useState<OrderDetailLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getOrderDetail(orderId);
      if (data) {
        setOrder(data);
        setLines(data.lines);
      }
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    }
  }, [orderId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    load().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order_lines:order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_lines', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new as Partial<OrderDetailLine> & { id: number };
          if (!updated?.id) return;
          setLines((prev) =>
            prev.map((line) => {
              if (line.id === updated.id) {
                return {
                  ...line,
                  package_scanned: updated.package_scanned ?? line.package_scanned,
                  unit_scanned: updated.unit_scanned ?? line.unit_scanned,
                  package_checked: updated.package_checked ?? line.package_checked,
                  unit_checked: updated.unit_checked ?? line.unit_checked,
                };
              }
              return line;
            })
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const updatedOrder = payload.new as { status?: OrderStatus };
          if (updatedOrder?.status) {
            setOrder((prev) => (prev ? { ...prev, status: updatedOrder.status! } : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return { order, lines, setLines, loading, refreshing, onRefresh };
}
