import { describe, it, expect } from 'vitest';
import { mixWithWhite } from '@/lib/color';

describe('mixWithWhite', () => {
  it('mixes #000000 with 0.5 to produce #808080', () => {
    expect(mixWithWhite('#000000', 0.5)).toBe('#808080');
  });

  it('mixes #F2A541 with 0.25 according to the channel formula', () => {
    const hex = '#F2A541';
    const ratio = 0.25;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const calcChannel = (c: number) =>
      Math.round(c + (255 - c) * ratio).toString(16).padStart(2, '0').toUpperCase();

    const expected = `#${calcChannel(r)}${calcChannel(g)}${calcChannel(b)}`;

    expect(mixWithWhite(hex, ratio)).toBe(expected);
    expect(mixWithWhite(hex, ratio)).toBe('#F5BC71');
  });
});
