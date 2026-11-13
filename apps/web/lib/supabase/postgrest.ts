/**
 * Normalizes and escapes search terms for PostgREST .or() filter expressions:
 * Replaces reserved delimiters (`,`, `(`, `)`, `"`) with a space,
 * and escapes SQL LIKE wildcard characters (`\`, `%`, `_`).
 */
export function escapePostgrestFilter(str: string): string {
  return str.replace(/[,()"]/g, ' ').replace(/[\\%_]/g, '\\$&');
}
