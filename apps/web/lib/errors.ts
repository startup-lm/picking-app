const ERROR_MESSAGES: Record<string, string> = {
  forbidden: 'No tenés permiso para esta acción',
  not_found: 'Pedido o línea inexistente',
  invalid_argument: 'Datos inválidos',
  invalid_transition: 'El pedido no está en un estado que permita esta acción',
  out_of_range: 'Ya se escaneó el total de esa línea',
  incomplete: 'Faltan artículos por escanear',
  dispatch_check_disabled: 'El control de despacho está desactivado',
  unknown_code: 'Código no reconocido',
  not_in_order: 'Ese artículo no está en este pedido',
  reason_required: 'Falta el motivo',
  invalid_order: 'El pedido tiene datos inválidos',
  order_locked: 'El pedido ya no se puede editar',
  missing_sku: 'Falta el SKU',
  duplicate_sku_in_file: 'SKU duplicado en el archivo',
  invalid_units_per_package: 'Unidades por bulto inválidas',
  missing_description: 'Falta la descripción',
  missing_barcode: 'Falta código de barra',
  same_barcode: 'El código de bulto y unidad no pueden ser iguales',
  duplicate_barcode_in_file: 'Código de barra duplicado en el archivo',
  barcode_in_use: 'Código de barra ya asignado a otro producto',
};

export function errorMessage(e: unknown): string {
  let msg = '';
  if (typeof e === 'string') {
    msg = e;
  } else if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    msg = (e as { message: string }).message;
  }

  const code = msg.trim();
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code];
  }

  return 'No se pudo completar la acción. Revisá la conexión e intentá de nuevo.';
}
