import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { ProductOrder } from '@/types/db';

const TABLE = 'product_order' as const;

/** Trae líneas por order_id. En error: alerta y [] */
export async function getProductOrdersByOrder(
  orderId: string | number
): Promise<ProductOrder[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned, created_at, updated_at'
      )
      .eq('order_id', String(orderId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los artículos del pedido');
      return [];
    }
    return (data ?? []) as ProductOrder[];
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudieron cargar los artículos del pedido');
    return [];
  }
}

/** Incrementa de forma segura. En error: alerta y null (no lanza) */
export async function incrementProductOrderScanByRowId(
  rowId: number,
  kind: 'unit' | 'package',
  delta = 1
): Promise<ProductOrder | null> {
  try {
    const { data: current, error: e1 } = await supabase
      .from(TABLE)
      .select('id, unit_scanned, package_scanned, unit_total, package_total')
      .eq('id', rowId)
      .maybeSingle();

    if (e1) {
      console.error(e1);
      Alert.alert('Error', 'No se pudo leer la línea');
      return null;
    }
    if (!current) {
      Alert.alert('No encontrado', 'Línea no encontrada');
      return null;
    }

    const next =
      kind === 'unit'
        ? {
            unit_scanned: Math.min(
              (current.unit_scanned ?? 0) + delta,
              current.unit_total ?? Number.MAX_SAFE_INTEGER
            ),
          }
        : {
            package_scanned: Math.min(
              (current.package_scanned ?? 0) + delta,
              current.package_total ?? Number.MAX_SAFE_INTEGER
            ),
          };

    const { data: updated, error: e2 } = await supabase
      .from(TABLE)
      .update(next)
      .eq('id', rowId)
      .select(
        'id, order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned, created_at, updated_at'
      )
      .maybeSingle();

    if (e2) {
      console.error(e2);
      Alert.alert('Error', 'No se pudo actualizar la línea');
      return null;
    }
    if (!updated) {
      Alert.alert('Error', 'No se pudo actualizar la línea');
      return null;
    }

    return updated as ProductOrder;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo actualizar la línea');
    return null;
  }
}

/** Decrementa de forma segura (piso 0). En error: alerta y null (no lanza) */
export async function decrementProductOrderScanByRowId(
  rowId: number,
  kind: 'unit' | 'package',
  delta = 1
): Promise<ProductOrder | null> {
  try {
    const { data: current, error: e1 } = await supabase
      .from(TABLE)
      .select('id, unit_scanned, package_scanned, unit_total, package_total')
      .eq('id', rowId)
      .maybeSingle();

    if (e1) {
      console.error(e1);
      Alert.alert('Error', 'No se pudo leer la línea');
      return null;
    }
    if (!current) {
      Alert.alert('No encontrado', 'Línea no encontrada');
      return null;
    }

    const next =
      kind === 'unit'
        ? {
            unit_scanned: Math.max(0, (current.unit_scanned ?? 0) - delta),
          }
        : {
            package_scanned: Math.max(0, (current.package_scanned ?? 0) - delta),
          };

    const { data: updated, error: e2 } = await supabase
      .from(TABLE)
      .update(next)
      .eq('id', rowId)
      .select(
        'id, order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned, created_at, updated_at'
      )
      .maybeSingle();

    if (e2) {
      console.error(e2);
      Alert.alert('Error', 'No se pudo actualizar la línea');
      return null;
    }
    if (!updated) {
      Alert.alert('Error', 'No se pudo actualizar la línea');
      return null;
    }

    return updated as ProductOrder;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo actualizar la línea');
    return null;
  }
}