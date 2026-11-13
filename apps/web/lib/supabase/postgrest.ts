/**
 * Escapes PostgREST special characters for filter expressions and ILIKE patterns:
 * %, _, ,, (, )
 */
export function escapePostgrestFilter(str: string): string {
  return str.replace(/([%_,()])/g, '\\$1');
}
