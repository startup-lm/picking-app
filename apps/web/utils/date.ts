export function formatDate(isoOrYmd: string): string {
  if (!isoOrYmd) return '';
  // Soporta 'YYYY-MM-DD' (del RPC) y ISO completo
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoOrYmd);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(isoOrYmd);
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const fecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const hora  = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${fecha} ${hora}`;
}
