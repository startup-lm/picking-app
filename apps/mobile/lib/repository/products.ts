import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/types/db';

const TABLE = 'products' as const;

/** Lista de productos con paginación completa — en error: alerta y [] */
export async function getProducts(): Promise<Product[]> {
  try {
    const all: Product[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, sku, description, package_barcode, unit_barcode, created_at')
        .order('description', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudieron cargar los productos');
        return all;
      }

      const rows = (data ?? []) as Product[];
      all.push(...rows);
      if (rows.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }

    return all;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudieron cargar los productos');
    return [];
  }
}

/** Trae los productos específicos por una lista de IDs (con chunking seguro) */
export async function getProductsByIds(ids: (number | string)[]): Promise<Product[]> {
  if (!ids || ids.length === 0) return [];
  try {
    const numericIds = Array.from(new Set(ids.map(Number).filter((n) => !Number.isNaN(n))));
    if (numericIds.length === 0) return [];

    const CHUNK_SIZE = 500;
    const all: Product[] = [];

    for (let i = 0; i < numericIds.length; i += CHUNK_SIZE) {
      const chunk = numericIds.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, sku, description, package_barcode, unit_barcode, created_at')
        .in('id', chunk);

      if (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudieron cargar los artículos');
        return all;
      }
      if (data) {
        all.push(...(data as Product[]));
      }
    }

    return all;
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudieron cargar los artículos');
    return [];
  }
}

/**
 * Busca por código de barras (numérico) o SKU (texto).
 * - Si hay error de DB: alerta y devuelve null
 * - Si no encuentra: devuelve null (la UI puede mostrar “No encontrado”)
 */
export async function findProductByBarcode(code: string | number): Promise<Product | null> {
  try {
    const isNumeric = typeof code === 'number' || /^[0-9]+$/.test(String(code));

    if (isNumeric) {
      const n = Number(code);
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, sku, description, package_barcode, unit_barcode')
        .or(`package_barcode.eq.${n},unit_barcode.eq.${n}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudo buscar el producto por código de barras');
        return null;
      }
      return (data ?? null) as Product | null;
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, sku, description, package_barcode, unit_barcode')
        .ilike('sku', String(code)) // búsqueda exacta case-insensitive (sin comodines)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'No se pudo buscar el producto por SKU');
        return null;
      }
      return (data ?? null) as Product | null;
    }
  } catch (e: any) {
    console.error(e);
    Alert.alert('Error inesperado', e?.message ?? 'No se pudo buscar el producto');
    return null;
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, description, package_barcode, unit_barcode')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Product | null;
}
