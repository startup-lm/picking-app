// lib/repository/orders.ts
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { Order } from '@/types/db';

const TABLE = 'orders' as const;
const COLUMNS = 'id, client, total_package, total_unit, status, created_at, updated_at';

export type OrderUpdate = Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;

export type GetOrdersOptions = {
  status?: 'all' | 'pending' | 'assembled';
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export async function getOrders(options: GetOrdersOptions = {}): Promise<Order[]> {
  const {
    status = 'all',
    orderDir = 'desc',
    page = 0,
    pageSize = 25,
  } = options;

  try {
    let query = supabase.from(TABLE).select(COLUMNS);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: orderDir === 'asc' })
      .range(from, to);

    if (error) {
      Alert.alert('Error', error.message ?? 'No se pudieron cargar los pedidos');
      return [];
    }
    return (data ?? []) as Order[];
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'Fallo inesperado al listar pedidos');
    return [];
  }
}

export async function getOrderById(id: number): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      Alert.alert('Error', error.message ?? 'No se pudo obtener el pedido');
      return null;
    }
    return (data ?? null) as Order | null;
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'Fallo inesperado al obtener el pedido');
    return null;
  }
}

export async function updateOrder(id: number, payload: OrderUpdate): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) {
      Alert.alert('Error', error.message ?? 'No se pudo actualizar el pedido');
      return null;
    }
    if (!data) {
      Alert.alert('Error', 'Pedido no encontrado o sin permisos');
      return null;
    }
    return data as Order;
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'Fallo inesperado al actualizar el pedido');
    return null;
  }
}

export async function deleteOrder(id: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('id'); // para confirmar borrado

    if (error) {
      Alert.alert('Error', error.message ?? 'No se pudo eliminar el pedido');
      return false;
    }
    if (!data?.length) {
      Alert.alert('Error', 'No se encontró el pedido o no tenés permisos');
      return false;
    }
    return true;
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'Fallo inesperado al eliminar el pedido');
    return false;
  }
}
