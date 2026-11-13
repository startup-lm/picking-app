import { describe, it, expect } from 'vitest';
import { escapePostgrestFilter } from '@/lib/supabase/postgrest';

describe('escapePostgrestFilter', () => {
  it('replaces delimiters with space and escapes wildcards', () => {
    expect(escapePostgrestFilter('a,b(c)%_')).toBe('a b c \\%\\_');
  });

  it('escapes backslash and handles quotes', () => {
    expect(escapePostgrestFilter('item"1\\2')).toBe('item 1\\\\2');
  });
});
