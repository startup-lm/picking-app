export function mixWithWhite(hex: string, ratio: number): string {
  const clean = hex.replace(/^#/, '').trim();
  let r = 0;
  let g = 0;
  let b = 0;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return hex;
  }

  const mixChannel = (c: number) => {
    const mixed = Math.round(c + (255 - c) * ratio);
    const clamped = Math.min(255, Math.max(0, mixed));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };

  return `#${mixChannel(r)}${mixChannel(g)}${mixChannel(b)}`;
}
