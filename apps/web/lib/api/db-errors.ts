import { jsonError, rpcErrorResponse } from './responses';

export function handleProductDbError(error: any): Response {
  const code = error?.code || '';
  const message = error?.message || '';
  const details = error?.details || '';
  const allText = `${message} ${details}`;

  if (code === '23505' || allText.includes('23505')) {
    if (allText.includes('products_sku_key')) {
      return jsonError(409, 'sku_taken', 'Ya existe un producto con ese SKU');
    }
    if (allText.includes('product_barcodes_pkey')) {
      return jsonError(409, 'barcode_in_use', 'Ese código de barras ya lo usa otro producto');
    }
  }

  if (code === '23514' || allText.includes('23514')) {
    return jsonError(400, 'invalid_product', 'Datos del producto inválidos');
  }

  return rpcErrorResponse(error);
}

export function handleCustomerDbError(error: any): Response {
  const code = error?.code || '';
  const message = error?.message || '';
  const details = error?.details || '';
  const allText = `${message} ${details}`;

  if (code === '23505' || allText.includes('23505')) {
    if (allText.includes('customers_code_key')) {
      return jsonError(409, 'code_taken', 'Ya existe un cliente con ese código');
    }
    if (allText.includes('customers_lower_name_idx')) {
      return jsonError(409, 'name_taken', 'Ya existe un cliente con ese nombre');
    }
  }

  if (code === '23514' || allText.includes('23514')) {
    return jsonError(400, 'invalid_argument', 'Datos de cliente inválidos');
  }

  return rpcErrorResponse(error);
}
