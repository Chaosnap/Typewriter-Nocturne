// Readability guarantees for the lighting layer.
//
// The lighting canvas is composited over the terminal with `mix-blend-mode: soft-light`
// (0.5 = unchanged, above 0.5 brightens, below darkens) and the glow canvas with `screen`
// (0 = unchanged). Both affect ink and paper at the same pixel, so they can reduce the contrast
// between them. These functions compute how far each layer may go before the contrast of the
// theme's ink on its paper would drop below `minRatio`. The renderer clamps to these limits.

import {contrastOfUnit, screen, softLight, toUnit} from './color';

type Unit3 = [number, number, number];

const applySoftLight = (backdrop: Unit3, source: Unit3): Unit3 => [
  softLight(backdrop[0], source[0]),
  softLight(backdrop[1], source[1]),
  softLight(backdrop[2], source[2])
];

const applyScreen = (backdrop: Unit3, source: Unit3): Unit3 => [
  screen(backdrop[0], source[0]),
  screen(backdrop[1], source[1]),
  screen(backdrop[2], source[2])
];

/** Soft-light source value for a light amount (0–1) of a given tint; 0 → neutral grey. */
export const lightSource = (amount: number, tint: Unit3): Unit3 => [
  0.5 + 0.5 * amount * tint[0],
  0.5 + 0.5 * amount * tint[1],
  0.5 + 0.5 * amount * tint[2]
];

/** Soft-light source value for a shade amount (0–1). */
export const shadeSource = (amount: number): Unit3 => [0.5 - 0.5 * amount, 0.5 - 0.5 * amount, 0.5 - 0.5 * amount];

/** Screen source for a glow amount (0–1) of a given tint. */
export const glowSource = (amount: number, tint: Unit3): Unit3 => [
  amount * tint[0],
  amount * tint[1],
  amount * tint[2]
];

/** Largest value in [0, 1] for which `ok(value)` holds, assuming `ok` is monotone (true → false). */
function largestSafe(ok: (value: number) => boolean): number {
  if (ok(1)) {
    return 1;
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (ok(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

export type LightingLimits = {
  /** Maximum soft-light brightening (0–1) for the given tint. */
  light: number;
  /** Maximum soft-light darkening (0–1). */
  shade: number;
  /** Maximum screen glow (0–1) for the given tint. */
  glow: number;
};

/**
 * Computes how strong the lighting may become over the paper while keeping ink/paper contrast
 * at or above `minRatio` (or the unlit contrast, if that is already lower).
 */
export function lightingLimits(ink: string, paper: string, tintColor: string, minRatio: number): LightingLimits {
  const inkUnit = toUnit(ink);
  const paperUnit = toUnit(paper);
  const tint = toUnit(tintColor);
  const peak = Math.max(tint[0], tint[1], tint[2], 1e-6);
  const normalisedTint: Unit3 = [tint[0] / peak, tint[1] / peak, tint[2] / peak];
  const target = Math.min(minRatio, contrastOfUnit(inkUnit, paperUnit));

  const contrastWith = (blend: (backdrop: Unit3) => Unit3) => contrastOfUnit(blend(inkUnit), blend(paperUnit));
  const keeps = (blend: (backdrop: Unit3) => Unit3) => contrastWith(blend) >= target - 1e-9;

  return {
    light: largestSafe((amount) => keeps((c) => applySoftLight(c, lightSource(amount, normalisedTint)))),
    shade: largestSafe((amount) => keeps((c) => applySoftLight(c, shadeSource(amount)))),
    glow: largestSafe((amount) => keeps((c) => applyScreen(c, glowSource(amount, normalisedTint))))
  };
}

/**
 * Lowest ambient light (a multiply factor applied to ink and paper alike, in sRGB) that keeps the
 * contrast of ink on paper at or above `minRatio` (or the unlit contrast, if that is lower).
 */
export function ambientFloor(ink: string, paper: string, minRatio: number): number {
  const inkUnit = toUnit(ink);
  const paperUnit = toUnit(paper);
  const target = Math.min(minRatio, contrastOfUnit(inkUnit, paperUnit));
  const scaled = (c: Unit3, k: number): Unit3 => [c[0] * k, c[1] * k, c[2] * k];
  const keeps = (k: number) => contrastOfUnit(scaled(inkUnit, k), scaled(paperUnit, k)) >= target - 1e-9;
  if (keeps(0)) {
    return 0;
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (keeps(mid)) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return high;
}

/** Contrast of ink on paper under a soft-light source and a screen glow (for tests and diagnostics). */
export function litContrast(ink: string, paper: string, softLightSource: Unit3, screenSource: Unit3): number {
  const blend = (c: Unit3) => applyScreen(applySoftLight(c, softLightSource), screenSource);
  return contrastOfUnit(blend(toUnit(ink)), blend(toUnit(paper)));
}

/** Converts a beam angle in degrees to the half-angle cosine used by the shader. */
export const spreadToCosine = (degrees: number) => Math.cos((Math.min(170, Math.max(5, degrees)) * Math.PI) / 360);
