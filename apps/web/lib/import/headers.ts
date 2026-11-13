export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export type ProductField =
  | 'sku'
  | 'description'
  | 'unit_barcode'
  | 'package_barcode'
  | 'units_per_package'
  | 'location';

export type OrderField =
  | 'order_number'
  | 'customer'
  | 'sku'
  | 'packages'
  | 'units'
  | 'quantity'
  | 'due_date'
  | 'priority'
  | 'notes';

export const PRODUCT_ALIASES: Record<ProductField, string[]> = {
  sku: ['sku', 'codigo', 'cod', 'codigo_interno', 'articulo', 'producto'],
  description: ['descripcion', 'description', 'detalle', 'nombre'],
  unit_barcode: ['codigo_unidad', 'ean', 'ean13', 'codigo_barras', 'barcode', 'cod_barra_unidad'],
  package_barcode: ['codigo_bulto', 'dun', 'dun14', 'itf14', 'cod_barra_bulto'],
  units_per_package: ['unidades_por_bulto', 'unid_x_bulto', 'unidades_x_bulto', 'x_bulto', 'upb'],
  location: ['ubicacion', 'location', 'posicion'],
};

export const ORDER_ALIASES: Record<OrderField, string[]> = {
  order_number: ['pedido', 'nro_pedido', 'n_pedido', 'numero_pedido', 'orden', 'factura', 'comprobante'],
  customer: ['cliente', 'customer', 'razon_social', 'destinatario'],
  sku: ['sku', 'codigo', 'cod', 'codigo_interno', 'articulo', 'producto'],
  packages: ['bultos', 'cajas'],
  units: ['unidades', 'sueltas', 'unidades_sueltas', 'uni_sueltas'],
  quantity: ['cantidad', 'qty', 'total_unidades'],
  due_date: ['fecha_entrega', 'entrega', 'fecha'],
  priority: ['prioridad', 'urgente'],
  notes: ['notas', 'observaciones', 'obs'],
};

export function mapHeaders<F extends string>(
  headers: unknown[],
  aliases: Record<F, string[]>
): { index: Partial<Record<F, number>>; ignored: string[]; duplicated: F[] } {
  const index: Partial<Record<F, number>> = {};
  const ignored: string[] = [];
  const duplicated: F[] = [];

  const aliasEntries = Object.entries(aliases) as [F, string[]][];

  for (let i = 0; i < headers.length; i++) {
    const raw = String(headers[i] ?? '').trim();
    const norm = normalizeHeader(headers[i]);

    let matchedField: F | undefined;
    for (const [field, list] of aliasEntries) {
      if (list.includes(norm)) {
        matchedField = field;
        break;
      }
    }

    if (matchedField !== undefined) {
      if (index[matchedField] === undefined) {
        index[matchedField] = i;
      } else {
        if (!duplicated.includes(matchedField)) {
          duplicated.push(matchedField);
        }
      }
    } else {
      if (raw) {
        ignored.push(raw);
      }
    }
  }

  return { index, ignored, duplicated };
}
