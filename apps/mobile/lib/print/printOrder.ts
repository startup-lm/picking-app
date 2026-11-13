import { getOrderDetail } from '@/lib/repository/orders';
import { generateOrderPDF } from '@/lib/print/printOrderSheet';
import type { BuildOptions, PrintItem } from '@/types/print';

export async function generateOrderPdf(
  orderId: number,
  options?: BuildOptions
): Promise<{ uri: string; base64?: string }> {
  const detail = await getOrderDetail(orderId);
  if (!detail) {
    throw new Error('not_found');
  }

  const items: PrintItem[] = detail.lines
    .map((l) => ({
      sku: l.product.sku,
      description: l.product.description,
      location: l.location,
      bultos: l.package_total,
      sueltas: l.unit_total,
    }))
    .sort((a, b) => {
      const la = (a.location ?? '').trim();
      const lb = (b.location ?? '').trim();
      if (!la && lb) return 1;
      if (la && !lb) return -1;
      const locCmp = la.localeCompare(lb, 'es', { numeric: true, sensitivity: 'base' });
      if (locCmp !== 0) return locCmp;
      return a.sku.localeCompare(b.sku, 'es', { numeric: true, sensitivity: 'base' });
    });

  const opts: BuildOptions = { padRowsTo: 15, ...options };
  return await generateOrderPDF(
    {
      order_number: detail.order_number,
      customer_name: detail.customer_name,
      total_package: detail.total_package,
      total_unit: detail.total_unit,
    },
    items,
    opts
  );
}
