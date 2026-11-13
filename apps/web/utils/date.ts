export function formatDate(isoOrYmd: string, timeZone?: string): string {
  if (!isoOrYmd) return '';
  // Soporta 'YYYY-MM-DD' (del RPC) y ISO completo
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoOrYmd);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(isoOrYmd);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat('es-AR', options).format(d);
}

export function formatDateTime(iso: string, timeZone?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (timeZone) {
    dateOptions.timeZone = timeZone;
    timeOptions.timeZone = timeZone;
  }
  const fecha = new Intl.DateTimeFormat('es-AR', dateOptions).format(d);
  const hora  = new Intl.DateTimeFormat('es-AR', timeOptions).format(d);
  return `${fecha} ${hora}`;
}
