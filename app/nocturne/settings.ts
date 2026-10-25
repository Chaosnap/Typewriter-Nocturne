// Nocturne settings: defaults, presets and validation.
//
// Settings are plain JSON stored in <config dir>/nocturne.json. Everything read from disk or
// received over IPC goes through `sanitizeSettings`, which drops unknown keys, clamps numbers,
// checks enums and only accepts colours / font names from a strict grammar.

import {isColor} from './color';
import {isPaperId} from './papers';
import {isThemeId} from './themes';
import type {
  ChromeSettings,
  ClipFinish,
  CursorStyle,
  EffectQuality,
  FocusSettings,
  FolioFont,
  FolioPaperId,
  FolioStyle,
  FontId,
  LightingPresetId,
  LightingSettings,
  NocturneSettings,
  PaperSettings,
  PrintSettings,
  RibbonColor,
  RibbonStyle,
  ScrollbarSettings,
  SealColor,
  SealEmblem,
  SettingsPatch,
  ThemeChoice,
  TypewriterSettings,
  TypewriterVoice,
  TypographyPresetId,
  TypographySettings,
  WindowSettings
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
  {id: 'recursive-mono', label: 'Recursive Mono', bundled: false, family: 'Recursive Mono Linear', ligatures: true},
  // Nerd Font builds of popular faces. The bundled Symbols Nerd Font gives every face the icons anyway.
  {
    id: 'jetbrains-mono-nf',
    label: 'JetBrainsMono Nerd Font',
    bundled: false,
    family: 'JetBrainsMono Nerd Font',
    ligatures: true
  },
  {id: 'fira-code-nf', label: 'FiraCode Nerd Font', bundled: false, family: 'FiraCode Nerd Font', ligatures: true},
  {id: 'hack-nf', label: 'Hack Nerd Font', bundled: false, family: 'Hack Nerd Font', ligatures: false},
  {id: 'meslo-nf', label: 'MesloLGS Nerd Font', bundled: false, family: 'MesloLGS NF', ligatures: false},
  {
    id: 'caskaydia-nf',
    label: 'CaskaydiaCove Nerd Font',
    bundled: false,
    family: 'CaskaydiaCove Nerd Font',
    ligatures: true
  }
];

/** Icons of Nerd Fonts (Powerline, Devicons, Font Awesome…), bundled and used after any face (MIT). */
export const NERD_SYMBOLS = '"Symbols Nerd Font Mono"';

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
    const family = typography.customFamily;
    if (!isSafeFontFamily(family)) {
      return `"IBM Plex Mono", ${NERD_SYMBOLS}, ${MONO_FALLBACK}`;
    }
    // A single family name is quoted (names may start with a digit); a typed stack is used as is.
    const custom = /[,"']/.test(family) ? family : `"${family}"`;
    return `${custom}, ${NERD_SYMBOLS}, ${MONO_FALLBACK}`;
  }
  const entry = FONTS.find((font) => font.id === typography.font);
  if (!entry?.family) {
    return `${NERD_SYMBOLS}, ${MONO_FALLBACK}`;
  }
  return `${quoteFamily(entry.family)}, ${NERD_SYMBOLS}, ${MONO_FALLBACK}`;
}

export const UI_SERIF = '"EB Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const DISPLAY_SERIF = '"Cormorant Garamond", "EB Garamond", "Iowan Old Style", Georgia, serif';

const SERIF_CJK = '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif';
const BOOK_SERIF = `"EB Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ${SERIF_CJK}`;

/** The face a folio's text is printed in, with its size in pixels on the page. */
export function folioFontStack(
  style: Pick<FolioStyle, 'font' | 'customFont'>,
  typography: Pick<TypographySettings, 'font' | 'customFamily'>
): {family: string; size: number} {
  switch (style.font) {
    case 'sonnet':
      return {family: BOOK_SERIF, size: 15};
    case 'display':
      return {family: `"Cormorant Garamond", "EB Garamond", Georgia, ${SERIF_CJK}`, size: 16.5};
    case 'plex':
      return {family: fontStack({font: 'ibm-plex-mono', customFamily: ''}), size: 13};
    case 'terminal':
      return {family: fontStack(typography), size: 13.5};
    case 'custom':
      return isSafeFontFamily(style.customFont)
        ? {family: fontStack({font: 'custom', customFamily: style.customFont}), size: 14}
        : {family: fontStack({font: 'courier-prime', customFamily: ''}), size: 14};
    default:
      return {family: fontStack({font: 'courier-prime', customFamily: ''}), size: 14};
  }
}

// ---------------------------------------------------------------------------------------------
// Presets

export const LIGHTING_PRESETS: Record<LightingPresetId, Partial<LightingSettings>> = {
  off: {enabled: false},
  balanced: {
    enabled: true,
    intensity: 1,
    spread: 74,
    beam: 'pointed',
    aim: 0,
    reach: 1,
    softness: 0.65,
    bloom: 0.25,
    grain: 0.1,
    cursorGlow: 0.35,
    paperIllumination: 0.5,
    particles: 0.45,
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
    particles: 0.75,
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
    version: 3,
    theme: 'paper-and-ink',
    focusMode: false,
    effects: true,
    chrome: {toolbar: true, statusBar: true, frame: true, epigraph: true, pullCord: true},
    paper: {style: 'onionskin', texture: 1, width: 0},
    lighting: {
      enabled: true,
      preset: 'balanced',
      source: 'theme',
      intensity: 1,
      spread: 74,
      beam: 'pointed',
      aim: 0,
      reach: 1,
      position: {x: 0.5, y: 0.1},
      window: {columns: 3, rows: 2, slant: 0, x: 0.34, y: 0.23},
      color: '',
      softness: 0.65,
      bloom: 0.25,
      grain: 0.1,
      cursorGlow: 0.35,
      paperIllumination: 0.5,
      particles: 0.45,
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
      selection: '',
      selectionStyle: 'ink'
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
      paperShake: 0,
      impression: 0.8
    },
    print: {keepInArchive: true, style: defaultFolioStyle()},
    focus: {background: 'paper', color: '#1c1916', paper: true, lighting: false},
    scrollbar: {style: 'clip', finish: 'silver', barOpacity: 0.45, barWidth: 6}
  };
}

export function defaultFolioStyle(): FolioStyle {
  return {
    paper: 'laid',
    sealColor: 'crimson',
    monogram: 'TN',
    emblem: 'moon',
    seal: true,
    ribbon: true,
    ribbonStyle: 'tails',
    ribbonColor: 'wax',
    font: 'typewriter',
    customFont: '',
    signature: ''
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
const CURSOR_STYLES: CursorStyle[] = ['quill', 'block', 'bar', 'underline'];
const VOICES: TypewriterVoice[] = ['standard', 'portable', 'electric', 'whisper'];
const LIGHT_SOURCES = ['theme', 'carriage', 'desk-lamp', 'moonlight'] as const;

const FOLIO_PAPERS: FolioPaperId[] = ['laid', 'cotton', 'vellum', 'parchment', 'night'];
const SEAL_COLORS: SealColor[] = ['crimson', 'oxblood', 'black', 'gold', 'emerald', 'sapphire'];
const SEAL_EMBLEMS: SealEmblem[] = ['moon', 'rose', 'quill', 'none'];
const RIBBON_STYLES: RibbonStyle[] = ['tails', 'loop', 'band', 'cross', 'banner', 'pendant'];
const RIBBON_COLORS: RibbonColor[] = ['wax', 'crimson', 'burgundy', 'navy', 'emerald', 'gold', 'ivory', 'black'];
const FOLIO_FONTS: FolioFont[] = ['typewriter', 'sonnet', 'display', 'plex', 'terminal', 'custom'];
const CLIP_FINISHES: ClipFinish[] = ['silver', 'brass', 'gold', 'black'];

/** One or two letters (any script) for the seal. */
const monogram = (value: unknown, fallback: string) => {
  const letters = typeof value === 'string' ? Array.from(value.trim()).filter((c) => /\p{L}|\p{N}/u.test(c)) : [];
  return letters.length > 0 ? letters.slice(0, 2).join('').toUpperCase() : fallback;
};

/** A name for the signature line: printable text only, at most 40 characters. */
const signature = (value: unknown, fallback: string) =>
  typeof value === 'string'
    ? value
        .replace(/[^\P{C}]/gu, '')
        .trim()
        .slice(0, 40)
    : fallback;

export function sanitizeFolioStyle(raw: unknown, base: FolioStyle = defaultFolioStyle()): FolioStyle {
  const value = isDict(raw) ? raw : {};
  return {
    paper: oneOf(value.paper, FOLIO_PAPERS, base.paper),
    sealColor: oneOf(value.sealColor, SEAL_COLORS, base.sealColor),
    monogram: monogram(value.monogram, base.monogram),
    emblem: oneOf(value.emblem, SEAL_EMBLEMS, base.emblem),
    seal: bool(value.seal, base.seal),
    ribbon: bool(value.ribbon, base.ribbon),
    ribbonStyle: oneOf(value.ribbonStyle, RIBBON_STYLES, base.ribbonStyle),
    ribbonColor: oneOf(value.ribbonColor, RIBBON_COLORS, base.ribbonColor),
    font: oneOf(value.font, FOLIO_FONTS, base.font),
    customFont: isSafeFontFamily(value.customFont) ? value.customFont : base.customFont,
    signature: signature(value.signature, base.signature)
  };
}

function sanitizePrint(raw: unknown, base: PrintSettings): PrintSettings {
  const value = isDict(raw) ? raw : {};
  return {
    keepInArchive: bool(value.keepInArchive, base.keepInArchive),
    style: sanitizeFolioStyle(value.style, base.style)
  };
}

function sanitizeFocus(raw: unknown, base: FocusSettings): FocusSettings {
  const value = isDict(raw) ? raw : {};
  const background = color(value.color, base.color);
  return {
    background: oneOf(value.background, ['paper', 'dark', 'custom'], base.background),
    color: background === '' ? base.color : background,
    paper: bool(value.paper, base.paper),
    lighting: bool(value.lighting, base.lighting)
  };
}

function sanitizeScrollbar(raw: unknown, base: ScrollbarSettings): ScrollbarSettings {
  const value = isDict(raw) ? raw : {};
  return {
    style: oneOf(value.style, ['clip', 'bar', 'native'], base.style),
    finish: oneOf(value.finish, CLIP_FINISHES, base.finish),
    barOpacity: round(num(value.barOpacity, base.barOpacity, 0.1, 0.9)),
    barWidth: num(value.barWidth, base.barWidth, 3, 12, 1)
  };
}

function sanitizeChrome(raw: unknown, base: ChromeSettings): ChromeSettings {
  const value = isDict(raw) ? raw : {};
  return {
    toolbar: bool(value.toolbar, base.toolbar),
    statusBar: bool(value.statusBar, base.statusBar),
    frame: bool(value.frame, base.frame),
    epigraph: bool(value.epigraph, base.epigraph),
    pullCord: bool(value.pullCord, base.pullCord)
  };
}

function sanitizePaper(raw: unknown, base: PaperSettings): PaperSettings {
  const value = isDict(raw) ? raw : {};
  const style = value.style;
  return {
    style: isPaperId(style) ? style : base.style,
    texture: round(num(value.texture, base.texture, 0, 1.6)),
    width: round(num(value.width, base.width, 0, 1))
  };
}

function sanitizeWindow(raw: unknown, base: WindowSettings): WindowSettings {
  const value = isDict(raw) ? raw : {};
  return {
    columns: num(value.columns, base.columns, 1, 6, 1),
    rows: num(value.rows, base.rows, 1, 6, 1),
    slant: num(value.slant, base.slant, -35, 35, 1),
    x: round(num(value.x, base.x, 0, 1)),
    y: round(num(value.y, base.y, 0, 1))
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
    beam: oneOf(value.beam, ['pointed', 'soft'], base.beam),
    aim: num(value.aim, base.aim, -45, 45, 1),
    reach: round(num(value.reach, base.reach, 0.2, 2)),
    position: {
      x: round(num(position.x, base.position.x, -0.5, 1.5)),
      y: round(num(position.y, base.position.y, -0.5, 1.5))
    },
    window: sanitizeWindow(value.window, base.window),
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
    selection: color(value.selection, base.selection),
    selectionStyle: oneOf(value.selectionStyle, ['ink', 'classic'], base.selectionStyle)
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
    paperShake: round(num(value.paperShake, base.paperShake, 0, 1)),
    impression: round(num(value.impression, base.impression, 0, 1))
  };
}

/** Version 2 made the quill the default cursor; version 3 returns to the block. */
function migrate(value: Dict): Dict {
  if (value.version !== 2 || !isDict(value.typography) || value.typography.cursorStyle !== 'quill') {
    return value;
  }
  return {...value, typography: {...value.typography, cursorStyle: 'block'}};
}

/** Returns a complete, valid settings object for any input (including garbage). */
export function sanitizeSettings(raw: unknown, base: NocturneSettings = defaultSettings()): NocturneSettings {
  const value = migrate(isDict(raw) ? raw : {});
  const rawTheme = value.theme;
  const theme: ThemeChoice = rawTheme === 'classic' || isThemeId(rawTheme) ? rawTheme : base.theme;
  return {
    version: 3,
    theme,
    focusMode: bool(value.focusMode, base.focusMode),
    effects: bool(value.effects, base.effects),
    chrome: sanitizeChrome(value.chrome, base.chrome),
    paper: sanitizePaper(value.paper, base.paper),
    lighting: sanitizeLighting(value.lighting, base.lighting),
    typography: sanitizeTypography(value.typography, base.typography),
    typewriter: sanitizeTypewriter(value.typewriter, base.typewriter),
    print: sanitizePrint(value.print, base.print),
    focus: sanitizeFocus(value.focus, base.focus),
    scrollbar: sanitizeScrollbar(value.scrollbar, base.scrollbar)
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
