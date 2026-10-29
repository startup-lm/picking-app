import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { getProductDispatchesByDispatch } from '@/lib/repository/productDispatch';
import { getProductsByIds, getProductById } from '@/lib/repository/products';
import type { Product, ProductDispatch } from '@/types/db';

export function useDispatchDetail(dispatchId: string) {
  const [rows, setRows] = useState<ProductDispatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!dispatchId) return;
    try {
      const dispatchRows = await getProductDispatchesByDispatch(dispatchId);
      const productIds = Array.from(new Set(dispatchRows.map((r) => r.product_id).filter(Boolean)));
      const prods = await getProductsByIds(productIds);
      setRows(dispatchRows);
      setProducts(prods);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar el despacho');
    }
  }, [dispatchId]);



  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await load(); }
      catch (err: any) { console.error(err); Alert.alert('Error', err?.message ?? 'No se pudo cargar el despacho'); }
      finally { setLoading(false); }
    })();
  }, [load]);

  useEffect(() => {
    if (!dispatchId) return;
    const channel = supabase
      .channel(`product_dispatch:dispatch:${dispatchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_dispatch', filter: `dispatch_id=eq.${dispatchId}` },
        (payload) => {
          const next = payload.new as ProductDispatch;
          if (!next?.id) return;
          setRows((curr) => {
            const idx = curr.findIndex((r) => r.id === next.id);
            if (idx === -1) return [next, ...curr];
            const copy = curr.slice();
            copy[idx] = { ...curr[idx], ...next };
            return copy;
          });

          if (next.product_id) {
            setProducts((curr) => {
              if (curr.some((p) => p.id === next.product_id)) return curr;
              getProductById(next.product_id).then((p) => {
                if (p) setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
              });
              return curr;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dispatchId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach(p => m.set(String(p.id), p));
    return m;
  }, [products]);

  return { rows, setRows, products, productMap, loading, refreshing, onRefresh };
}
