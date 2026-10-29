import { supabaseAdmin } from '../supabase/admin';

export async function getProductsMapBySku(skus: string[]) {
  const unique = Array.from(new Set(skus.map(s => s.trim())));
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, sku')
    .in('sku', unique);

  if (error) throw error;

  const map = new Map<string, number>();
  (data || []).forEach(row => map.set(String(row.sku).trim(), Number(row.id)));
  return map;
}
