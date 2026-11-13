function getTzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = parseInt(part.value, 10);
    }
  }
  const hour = values.hour === 24 ? 0 : values.hour;
  const asUtc = Date.UTC(values.year, values.month - 1, values.day, hour, values.minute, values.second);
  return asUtc - date.getTime();
}

export function localYmdToUtcIso(
  ymd: string,
  time: 'start' | 'end',
  timeZone: string = 'America/Argentina/Buenos_Aires'
): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const targetHour = time === 'start' ? 0 : 23;
  const targetMinute = time === 'start' ? 0 : 59;
  const targetSecond = time === 'start' ? 0 : 59;
  const targetMs = time === 'start' ? 0 : 999;

  const approx = new Date(Date.UTC(year, month - 1, day, targetHour, targetMinute, targetSecond, targetMs));
  const offset = getTzOffsetMs(approx, timeZone);
  const exact = new Date(approx.getTime() - offset);
  return exact.toISOString();
}

export function getTodayYmd(timeZone: string = 'America/Argentina/Buenos_Aires'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
