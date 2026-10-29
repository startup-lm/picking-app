import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { Dispatch } from '@/types/db';

const TABLE = 'dispatches' as const;
type DispatchUpdate = Partial<Omit<Dispatch, 'id' | 'created_at' | 'updated_at'>>;

export type GetDispatchesOptions = {
  status?: 'all' | 'pending' | 'delivered';
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

/** Lista de despachos (solo los cuyo order.status = 'assembled') con paginación y filtros. */
export async function getDispatches(options: GetDispatchesOptions = {}): Promise<Dispatch[]> {
  const {
    status = 'all',
    orderDir = 'desc',
    page = 0,
    pageSize = 25,
  } = options;

  try {
    let query = supabase
      .from(TABLE)
      .select(`id, client, total_package, total_unit, status, created_at, updated_at, orders!inner(status)`)
      .eq('orders.status', 'assembled');

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: orderDir === 'asc' })
      .range(from, to);

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los despachos');
      return [];
    }

    // data incluye la relación "orders"; la descartamos
    const rows = (data ?? []) as any[];
    return rows.map(({ orders, ...row }) => row) as Dispatch[];
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudieron cargar los despachos');
    return [];
  }
}

/** Detalle por id. En error: alerta y null */
export async function getDispatchById(id: number): Promise<Dispatch | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, client, total_package, total_unit, status, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo obtener el despacho');
      return null;
    }
    return (data ?? null) as Dispatch | null;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo obtener el despacho');
    return null;
  }
}

/** Update seguro: en error muestra alerta y devuelve null (no lanza). */
export async function updateDispatch(id: number, payload: DispatchUpdate): Promise<Dispatch | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('id, client, total_package, total_unit, status, created_at, updated_at')
      .maybeSingle();

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar el despacho');
      return null;
    }
    if (!data) {
      Alert.alert('No encontrado', 'Despacho no encontrado o no actualizado');
      return null;
    }
    return data as Dispatch;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo actualizar el despacho');
    return null;
  }
}

/** Delete seguro: devuelve true/false y muestra alerta en error (no lanza). */
export async function deleteDispatch(id: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo eliminar el despacho');
      return false;
    }
    if (!data?.length) {
      Alert.alert('No encontrado', 'No se encontró el despacho o no tenés permisos.');
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo eliminar el despacho');
    return false;
  }
}