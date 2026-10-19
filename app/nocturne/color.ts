// Small, dependency-free colour helpers shared by the main process (settings validation)
// and the renderer (lighting safety limits). Only a strict colour grammar is accepted so that
// values coming from settings files can be inserted into CSS without any risk of injection.

export type RGBA = {r: number; g: number; b: number; a: number};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+)\s*)?\)$/i;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(r, g, b)` and `rgba(r, g, b, a)`. */
export function parseColor(input: unknown): RGBA | null {
  if (typeof input !== 'string') {
    return null;
  }
  const value = input.trim();
  const hex = HEX.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length <= 4) {
      digits = Array.from(digits, (d) => d + d).join('');
    }
    const channel = (index: number) => parseInt(digits.slice(index * 2, index * 2 + 2), 16);
    return {
      r: channel(0),
      g: channel(1),
      b: channel(2),
      a: digits.length === 8 ? channel(3) / 255 : 1
    };
  }
  const fn = RGB_FN.exec(value);
  if (fn) {
    const [r, g, b] = [fn[1], fn[2], fn[3]].map(Number);
    if (r > 255 || g > 255 || b > 255) {
      return null;
    }
    return {r, g, b, a: fn[4] === undefined ? 1 : Number(fn[4])};
  }
  return null;
}

export const isColor = (input: unknown): input is string => parseColor(input) !== null;

const toHex2 = (value: number) => Math.round(value).toString(16).padStart(2, '0');

export function toHex({r, g, b}: RGBA): string {
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

export function toRgba({r, g, b, a}: RGBA): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
}

export function withAlpha(color: string, alpha: number): string {
  const parsed = parseColor(color);
  return parsed ? toRgba({...parsed, a: clamp01(alpha)}) : color;
}

/** Linear interpolation between two colours (alpha included). */
export function mix(from: string, to: string, amount: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) {
    return from;
  }
  const t = clamp01(amount);
  return toRgba({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  });
}

/** Normalised [0, 1] sRGB channels. */
export function toUnit(color: string): [number, number, number] {
  const parsed = parseColor(color) || {r: 0, g: 0, b: 0, a: 1};
  return [parsed.r / 255, parsed.g / 255, parsed.b / 255];
}

const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

/** WCAG 2.x relative luminance of normalised sRGB channels. */
export function luminanceOfUnit([r, g, b]: [number, number, number]): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastOfUnit(a: [number, number, number], b: [number, number, number]): number {
  const la = luminanceOfUnit(a);
  const lb = luminanceOfUnit(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG 2.x contrast ratio between two colours, ignoring alpha. */
export function contrast(a: string, b: string): number {
  return contrastOfUnit(toUnit(a), toUnit(b));
}

/**
 * W3C Compositing Level 1 `soft-light` for one channel.
 * `backdrop` is the terminal pixel, `source` the lighting layer value (0.5 = no change).
 */
export function softLight(backdrop: number, source: number): number {
  const cb = clamp01(backdrop);
  const cs = clamp01(source);
  if (cs <= 0.5) {
    return cb - (1 - 2 * cs) * cb * (1 - cb);
  }
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb);
  return cb + (2 * cs - 1) * (d - cb);
}

/** W3C `screen` for one channel (0 = no change). */
export function screen(backdrop: number, source: number): number {
  return 1 - (1 - clamp01(backdrop)) * (1 - clamp01(source));
}
