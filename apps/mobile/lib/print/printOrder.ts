import type { Order, Product } from '@/types/db';
import { getProductsByIds } from '@/lib/repository/products';
import { getProductOrdersByOrder } from '../repository/productOrder';
import { generateOrderPDF } from '@/lib/print/printOrderSheet';
import { BuildOptions, PrintItem } from '@/types/print';

export async function generateOrderPdfFromDb(
  order: Order,
  options?: BuildOptions
): Promise<{ uri: string; base64?: string }> {
  // 1) Líneas del pedido (product_order)
  const poRows = await getProductOrdersByOrder(order.id);

  // 2) Traer productos en batch (dedupe para no repetir llamadas)
  const uniqueIds = Array.from(new Set(poRows.map(r => r.product_id)));
  const products = await getProductsByIds(uniqueIds);
  const byId = new Map<number, Product | null>(products.map(p => [p.id, p]));

  // 3) Mapear a PrintItem[] asegurando todos los campos requeridos
  const items: PrintItem[] = poRows.map(r => {
    const p = byId.get(r.product_id) ?? null;

    const product: Product = {
      id: p?.id ?? r.product_id,
      sku: p?.sku ?? '',
      description: p?.description ?? '',
      package_barcode: p?.package_barcode ?? 0,
      unit_barcode: p?.unit_barcode ?? 0,
      // tu SELECT actual no trae created_at; lo completamos para cumplir el tipo
      created_at: (p as any)?.created_at ?? '',
    };

    return {
      product,
      bultos: r.package_total ?? 0,
      sueltas: r.unit_total ?? 0,
      location: (r as any).location ?? '',
    };
  });

  // 4) Generar PDF
  const opts: BuildOptions = { padRowsTo: 15, ...options };
  return await generateOrderPDF(order, items, opts);
}