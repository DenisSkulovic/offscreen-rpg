/** WCAG relative luminance and contrast. Pure; no DOM. */

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function channel(value: number) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const left = relativeLuminance(a);
  const right = relativeLuminance(b);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick a platform ink that clears 4.5:1 against the reading surface. */
export function readableInk(surface: string, preferred: string) {
  if (contrastRatio(preferred, surface) >= 4.5) return preferred;
  const light = '#f4f7f5';
  const dark = '#14202b';
  return contrastRatio(light, surface) >= contrastRatio(dark, surface)
    ? light
    : dark;
}

export function readableMuted(surface: string, ink: string) {
  const light = '#5c6b66';
  const dark = '#b7c4bc';
  const candidate = relativeLuminance(ink) > 0.5 ? dark : light;
  if (contrastRatio(candidate, surface) >= 4.5) return candidate;
  return ink;
}
