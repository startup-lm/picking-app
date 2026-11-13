import { isAuthError, signOut } from './session';

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
};

export function errorMessage(e: unknown): string {
  if (isAuthError(e)) {
    return 'La sesión venció. Volvé a ingresar.';
  }

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

export async function handleError(e: unknown): Promise<string> {
  if (isAuthError(e)) {
    await signOut('expired');
  }
  return errorMessage(e);
}
