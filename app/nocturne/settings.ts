// Nocturne settings: defaults, presets and validation.
//
// Settings are plain JSON stored in <config dir>/nocturne.json. Everything read from disk or
// received over IPC goes through `sanitizeSettings`, which drops unknown keys, clamps numbers,
// checks enums and only accepts colours / font names from a strict grammar.

import {isColor} from './color';
import {isThemeId} from './themes';
import type {
  ChromeSettings,
  CursorStyle,
  EffectQuality,
  FontId,
  LightingPresetId,
  LightingSettings,
  NocturneSettings,
  SettingsPatch,
  ThemeChoice,
  TypewriterSettings,
  TypewriterVoice,
  TypographyPresetId,
  TypographySettings
} from './types';

// ---------------------------------------------------------------------------------------------
// Fonts

const CJK_FALLBACK =
  '"PingFang SC", "Hiragino Sans", "Noto Sans Mono CJK SC", "Noto Sans CJK SC", "Microsoft YaHei", "Yu Gothic"';
const MONO_FALLBACK = `ui-monospace, "SF Mono", Menlo, Consolas, "Cascadia Mono", "DejaVu Sans Mono", ${CJK_FALLBACK}, monospace`;

export type FontEntry = {
  id: Exclude<FontId, 'custom'>;
  label: string;
  /** Shipped inside the app (SIL OFL 1.1). Other fonts must be installed by the user. */
  bundled: boolean;
  family: string;
  ligatures: boolean;
};

export const FONTS: FontEntry[] = [
  {id: 'ibm-plex-mono', label: 'IBM Plex Mono', bundled: true, family: 'IBM Plex Mono', ligatures: false},
  {id: 'courier-prime', label: 'Courier Prime', bundled: true, family: 'Courier Prime', ligatures: false},
  {id: 'system', label: 'System monospace', bundled: false, family: '', ligatures: false},
  {id: 'jetbrains-mono', label: 'JetBrains Mono', bundled: false, family: 'JetBrains Mono', ligatures: true},
  {id: 'monaspace-neon', label: 'Monaspace Neon', bundled: false, family: 'Monaspace Neon', ligatures: true},
  {id: 'commit-mono', label: 'Commit Mono', bundled: false, family: 'CommitMono', ligatures: false},
  {id: 'recursive-mono', label: 'Recursive Mono', bundled: false, family: 'Recursive Mono Linear', ligatures: true}
];

const FONT_IDS: FontId[] = [...FONTS.map((font) => font.id), 'custom'];

/** Letters, digits, spaces, quotes, commas, dots, dashes and underscores only. */
const SAFE_FAMILY = /^[\p{L}\p{N} ,"'._-]{1,200}$/u;

export function isSafeFontFamily(value: unknown): value is string {
  return typeof value === 'string' && SAFE_FAMILY.test(value) && !/["']{2}/.test(value);
}

const quoteFamily = (family: string) => (/^[\w-]+$/.test(family) ? family : `"${family}"`);

/** CSS font-family stack for the terminal, always ending in safe monospace and CJK fallbacks. */
export function fontStack(typography: Pick<TypographySettings, 'font' | 'customFamily'>): string {
  if (typography.font === 'custom') {
    return isSafeFontFamily(typography.customFamily)
      ? `${typography.customFamily}, ${MONO_FALLBACK}`
      : `"IBM Plex Mono", ${MONO_FALLBACK}`;
  }
  const entry = FONTS.find((font) => font.id === typography.font);
  if (!entry?.family) {
    return MONO_FALLBACK;
  }
  return `${quoteFamily(entry.family)}, ${MONO_FALLBACK}`;
}

export const UI_SERIF = '"EB Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const DISPLAY_SERIF = '"Cormorant Garamond", "EB Garamond", "Iowan Old Style", Georgia, serif';

// ---------------------------------------------------------------------------------------------
// Presets

export const LIGHTING_PRESETS: Record<LightingPresetId, Partial<LightingSettings>> = {
  off: {enabled: false},
  balanced: {
    enabled: true,
    intensity: 0.8,
    spread: 70,
    reach: 1,
    softness: 0.6,
    bloom: 0.25,
    grain: 0.1,
    cursorGlow: 0.35,
    paperIllumination: 0.5,
    particles: 0.15,
    afterimage: false,
    speed: 1
  },
  cinematic: {
    enabled: true,
    intensity: 1.35,
    spread: 96,
    reach: 1.25,
    softness: 0.75,
    bloom: 0.55,
    grain: 0.25,
    cursorGlow: 0.6,
    paperIllumination: 0.8,
    particles: 0.45,
    afterimage: true,
    speed: 1
  }
};

export const TYPOGRAPHY_PRESETS: Record<TypographyPresetId, Partial<TypographySettings>> = {
  study: {
    font: 'ibm-plex-mono',
    fontSize: 14,
    fontWeight: 400,
    fontWeightBold: 600,
    lineHeight: 1.3,
    letterSpacing: 0
  },
  manuscript: {
    font: 'courier-prime',
    fontSize: 15,
    fontWeight: 400,
    fontWeightBold: 700,
    lineHeight: 1.4,
    letterSpacing: 0
  },
  compact: {
    font: 'ibm-plex-mono',
    fontSize: 12,
    fontWeight: 400,
    fontWeightBold: 600,
    lineHeight: 1.15,
    letterSpacing: 0
  },
  recital: {
    font: 'ibm-plex-mono',
    fontSize: 15,
    fontWeight: 300,
    fontWeightBold: 600,
    lineHeight: 1.55,
    letterSpacing: 1
  }
};

// ---------------------------------------------------------------------------------------------
// Defaults

export function defaultSettings(): NocturneSettings {
  return {
    version: 1,
    theme: 'paper-and-ink',
    focusMode: false,
    effects: true,
    chrome: {toolbar: true, statusBar: true, frame: true, epigraph: true},
    lighting: {
      enabled: true,
      preset: 'balanced',
      source: 'theme',
      intensity: 0.8,
      spread: 70,
      reach: 1,
      position: {x: 0.5, y: 0.1},
      color: '',
      softness: 0.6,
      bloom: 0.25,
      grain: 0.1,
      cursorGlow: 0.35,
      paperIllumination: 0.5,
      particles: 0.15,
      afterimage: false,
      speed: 1,
      quality: 'auto'
    },
    typography: {
      preset: 'manuscript',
      font: 'courier-prime',
      customFamily: '',
      fontSize: 15,
      fontWeight: 400,
      fontWeightBold: 700,
      lineHeight: 1.4,
      letterSpacing: 0,
      ligatures: false,
      cursorStyle: 'block',
      cursorWidth: 2,
      cursorBlink: false,
      smoothing: 'auto',
      minimumContrast: 4.5,
      selection: ''
    },
    typewriter: {
      sound: true,
      volume: 0.45,
      voice: 'standard',
      variation: 0.5,
      returnSound: true,
      marginBell: true,
      bellColumnsFromEnd: 8,
      carriage: true,
      carriagePlacement: 'line',
      scale: true,
      paperFeed: 1.5,
      paperShake: 0
    }
  };
}

// ---------------------------------------------------------------------------------------------
// Validation

type Dict = Record<string, unknown>;

const isDict = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);

const num = (value: unknown, fallback: number, min: number, max: number, step?: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, value));
  return step ? Math.round(clamped / step) * step : clamped;
};

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const color = (value: unknown, fallback: string): string => (value === '' || isColor(value) ? value : fallback);

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

const QUALITIES: EffectQuality[] = ['auto', 'high', 'medium', 'low'];
const CURSOR_STYLES: CursorStyle[] = ['block', 'bar', 'underline'];
const VOICES: TypewriterVoice[] = ['standard', 'portable', 'electric', 'whisper'];
const LIGHT_SOURCES = ['theme', 'carriage', 'desk-lamp', 'moonlight'] as const;

function sanitizeChrome(raw: unknown, base: ChromeSettings): ChromeSettings {
  const value = isDict(raw) ? raw : {};
  return {
    toolbar: bool(value.toolbar, base.toolbar),
    statusBar: bool(value.statusBar, base.statusBar),
    frame: bool(value.frame, base.frame),
    epigraph: bool(value.epigraph, base.epigraph)
  };
}

function sanitizeLighting(raw: unknown, base: LightingSettings): LightingSettings {
  const value = isDict(raw) ? raw : {};
  const position = isDict(value.position) ? value.position : {};
  return {
    enabled: bool(value.enabled, base.enabled),
    preset: oneOf(value.preset, ['off', 'balanced', 'cinematic', 'custom'], base.preset),
    source: oneOf(value.source, LIGHT_SOURCES, base.source),
    intensity: round(num(value.intensity, base.intensity, 0, 2)),
    spread: num(value.spread, base.spread, 20, 160, 1),
    reach: round(num(value.reach, base.reach, 0.2, 2)),
    position: {
      x: round(num(position.x, base.position.x, -0.5, 1.5)),
      y: round(num(position.y, base.position.y, -0.5, 1.5))
    },
    color: color(value.color, base.color),
    softness: round(num(value.softness, base.softness, 0, 1)),
    bloom: round(num(value.bloom, base.bloom, 0, 1)),
    grain: round(num(value.grain, base.grain, 0, 1)),
    cursorGlow: round(num(value.cursorGlow, base.cursorGlow, 0, 1)),
    paperIllumination: round(num(value.paperIllumination, base.paperIllumination, 0, 1)),
    particles: round(num(value.particles, base.particles, 0, 1)),
    afterimage: bool(value.afterimage, base.afterimage),
    speed: round(num(value.speed, base.speed, 0.25, 2)),
    quality: oneOf(value.quality, QUALITIES, base.quality)
  };
}

function sanitizeTypography(raw: unknown, base: TypographySettings): TypographySettings {
  const value = isDict(raw) ? raw : {};
  const fontWeight = num(value.fontWeight, base.fontWeight, 100, 900, 100);
  const customFamily = value.customFamily;
  return {
    preset: oneOf(value.preset, ['study', 'manuscript', 'compact', 'recital', 'custom'], base.preset),
    font: oneOf(value.font, FONT_IDS, base.font),
    customFamily: isSafeFontFamily(customFamily) ? customFamily : '',
    fontSize: num(value.fontSize, base.fontSize, 8, 32, 0.5),
    fontWeight,
    fontWeightBold: Math.max(fontWeight, num(value.fontWeightBold, base.fontWeightBold, 100, 900, 100)),
    lineHeight: round(num(value.lineHeight, base.lineHeight, 1, 2), 2),
    letterSpacing: num(value.letterSpacing, base.letterSpacing, 0, 4, 1),
    ligatures: bool(value.ligatures, base.ligatures),
    cursorStyle: oneOf(value.cursorStyle, CURSOR_STYLES, base.cursorStyle),
    cursorWidth: num(value.cursorWidth, base.cursorWidth, 1, 6, 1),
    cursorBlink: bool(value.cursorBlink, base.cursorBlink),
    smoothing: oneOf(value.smoothing, ['auto', 'grayscale', 'subpixel'], base.smoothing),
    minimumContrast: round(num(value.minimumContrast, base.minimumContrast, 1, 21), 1),
    selection: color(value.selection, base.selection)
  };
}

function sanitizeTypewriter(raw: unknown, base: TypewriterSettings): TypewriterSettings {
  const value = isDict(raw) ? raw : {};
  return {
    sound: bool(value.sound, base.sound),
    volume: round(num(value.volume, base.volume, 0, 1)),
    voice: oneOf(value.voice, VOICES, base.voice),
    variation: round(num(value.variation, base.variation, 0, 1)),
    returnSound: bool(value.returnSound, base.returnSound),
    marginBell: bool(value.marginBell, base.marginBell),
    bellColumnsFromEnd: num(value.bellColumnsFromEnd, base.bellColumnsFromEnd, 1, 40, 1),
    carriage: bool(value.carriage, base.carriage),
    carriagePlacement: oneOf(value.carriagePlacement, ['line', 'bottom'], base.carriagePlacement),
    scale: bool(value.scale, base.scale),
    paperFeed: round(num(value.paperFeed, base.paperFeed, 0, 6), 1),
    paperShake: round(num(value.paperShake, base.paperShake, 0, 1))
  };
}

/** Returns a complete, valid settings object for any input (including garbage). */
export function sanitizeSettings(raw: unknown, base: NocturneSettings = defaultSettings()): NocturneSettings {
  const value = isDict(raw) ? raw : {};
  const rawTheme = value.theme;
  const theme: ThemeChoice = rawTheme === 'classic' || isThemeId(rawTheme) ? rawTheme : base.theme;
  return {
    version: 1,
    theme,
    focusMode: bool(value.focusMode, base.focusMode),
    effects: bool(value.effects, base.effects),
    chrome: sanitizeChrome(value.chrome, base.chrome),
    lighting: sanitizeLighting(value.lighting, base.lighting),
    typography: sanitizeTypography(value.typography, base.typography),
    typewriter: sanitizeTypewriter(value.typewriter, base.typewriter)
  };
}

/** Applies a partial update on top of valid settings and re-validates the result. */
export function patchSettings(current: NocturneSettings, patch: SettingsPatch): NocturneSettings {
  const merged: Dict = {...current};
  for (const [key, value] of Object.entries(patch)) {
    const existing = merged[key];
    merged[key] = isDict(existing) && isDict(value) ? {...existing, ...value} : value;
  }
  return sanitizeSettings(merged, current);
}

/** Settings with a lighting preset applied (marks the preset as active). */
export function applyLightingPreset(current: NocturneSettings, preset: LightingPresetId): NocturneSettings {
  return patchSettings(current, {lighting: {...LIGHTING_PRESETS[preset], preset}});
}

export function applyTypographyPreset(current: NocturneSettings, preset: TypographyPresetId): NocturneSettings {
  return patchSettings(current, {typography: {...TYPOGRAPHY_PRESETS[preset], preset}});
}

export function settingsEqual(a: NocturneSettings, b: NocturneSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
