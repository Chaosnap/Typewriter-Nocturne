// Design tokens and settings shared by the main process and the renderer.

export type AnsiColors = {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  lightBlack: string;
  lightRed: string;
  lightGreen: string;
  lightYellow: string;
  lightBlue: string;
  lightMagenta: string;
  lightCyan: string;
  lightWhite: string;
};

export type ThemeId = 'paper-and-ink' | 'midnight-study' | 'moonlit-poetry';

export type PaperId = 'cotton' | 'laid' | 'linen' | 'onionskin' | 'parchment' | 'night';

/** `classic` keeps the colours from hyper.json and draws no Nocturne chrome. */
export type ThemeChoice = ThemeId | 'classic';

export type LightSource = 'carriage' | 'desk-lamp' | 'moonlight';

export type NocturneTheme = {
  id: ThemeId;
  name: string;
  epithet: string;
  appearance: 'light' | 'dark';
  palette: {
    /** The desk / room around the sheet. */
    room: string;
    roomEdge: string;
    /** Terminal background. */
    paper: string;
    paperEdge: string;
    paperShadow: string;
    /** Terminal foreground. */
    ink: string;
    inkMuted: string;
    inkFaint: string;
    /** Brass, gold or silver detail. */
    accent: string;
    accentSoft: string;
    cursor: string;
    cursorAccent: string;
    selection: string;
    border: string;
    ansi: AnsiColors;
  };
  material: {
    frame: 'walnut' | 'charcoal' | 'slate';
    /** Opacity of the static paper grain, 0–1. */
    grain: number;
    metal: string;
    metalHighlight: string;
    metalShadow: string;
    ribbon: string;
    radius: {window: number; paper: number; control: number};
  };
  light: {
    source: LightSource;
    color: string;
    /** Normalised position of the light relative to the sheet. */
    position: {x: number; y: number};
    /** Darkness of the room outside the light, 0–1. */
    shade: number;
  };
  atmosphere: {
    particles: number;
    filmGrain: number;
    vignette: number;
  };
  /** The 3D typewriter: colour of the brass trim, strength of reflections, camera exposure. */
  scene: {trim: string; environment: number; exposure: number};
  /** Multiplier for chrome animation durations. */
  motion: number;
};

export type EffectQuality = 'auto' | 'high' | 'medium' | 'low';
export type LightingPresetId = 'off' | 'balanced' | 'cinematic';
export type TypographyPresetId = 'study' | 'manuscript' | 'compact' | 'recital';
export type FontId =
  | 'ibm-plex-mono'
  | 'courier-prime'
  | 'system'
  | 'jetbrains-mono'
  | 'monaspace-neon'
  | 'commit-mono'
  | 'recursive-mono'
  | 'jetbrains-mono-nf'
  | 'fira-code-nf'
  | 'hack-nf'
  | 'meslo-nf'
  | 'caskaydia-nf'
  | 'custom';
export type CursorStyle = 'block' | 'bar' | 'underline';
export type TypewriterVoice = 'standard' | 'portable' | 'electric' | 'whisper';

export type LightingSettings = {
  /** Master switch for the lighting layer. */
  enabled: boolean;
  preset: LightingPresetId | 'custom';
  /** `theme` follows the active theme's light source. */
  source: LightSource | 'theme';
  /** 0–2, shown as a percentage. */
  intensity: number;
  /** Beam angle in degrees (carriage lamp and desk lamp). */
  spread: number;
  /** Where the lamp points, swivelled left (−) or right (+) in degrees. */
  aim: number;
  /** 0.2–2, shown as a percentage of the sheet height. */
  reach: number;
  /** Normalised position (desk lamp, moonlight). */
  position: {x: number; y: number};
  /** Empty string = the theme's light colour. */
  color: string;
  softness: number;
  /** Brief bloom around freshly typed ink, 0–1. */
  bloom: number;
  /** Animated film grain, 0–1. */
  grain: number;
  cursorGlow: number;
  /** How much the light changes the paper texture, 0–1. */
  paperIllumination: number;
  /** Dust motes in the beam, 0–1. */
  particles: number;
  /** Short ghost of the last struck character. */
  afterimage: boolean;
  /** Animation speed multiplier, 0.25–2. */
  speed: number;
  quality: EffectQuality;
};

export type TypographySettings = {
  preset: TypographyPresetId | 'custom';
  font: FontId;
  /** Used when `font` is `custom`; restricted to a safe font-family grammar. */
  customFamily: string;
  fontSize: number;
  fontWeight: number;
  fontWeightBold: number;
  lineHeight: number;
  /** Extra pixels per cell. Whole pixels only so every cell keeps the same width. */
  letterSpacing: number;
  ligatures: boolean;
  cursorStyle: CursorStyle;
  /** Bar cursor thickness in pixels. */
  cursorWidth: number;
  cursorBlink: boolean;
  smoothing: 'auto' | 'grayscale' | 'subpixel';
  /** xterm.js `minimumContrastRatio`; 1 disables the adjustment. */
  minimumContrast: number;
  /** Empty string = the theme's selection colour. */
  selection: string;
};

export type TypewriterSettings = {
  /** Global mute for every typewriter sound. */
  sound: boolean;
  volume: number;
  voice: TypewriterVoice;
  /** Random variation between strikes, 0–1. */
  variation: number;
  returnSound: boolean;
  /** Bell when the cursor passes the right margin while typing. */
  marginBell: boolean;
  bellColumnsFromEnd: number;
  /** Carriage rail with a type-guide needle that follows the cursor. */
  carriage: boolean;
  /** `line`: under the current line (docks to the bottom in full-screen programs). */
  carriagePlacement: 'line' | 'bottom';
  /** Column scale on the status bar. */
  scale: boolean;
  /** Pixels the sheet advances on Return. */
  paperFeed: number;
  /** Tiny shake of the sheet on each strike, 0–1. */
  paperShake: number;
  /** Strength of the fresh-ink impression where a typed character lands, 0–1. */
  impression: number;
};

export type PaperSettings = {
  style: PaperId;
  /** Depth of the paper's surface relief, 0–1.6. */
  texture: number;
};

export type PrintSettings = {
  /** Printed pages are kept in the Archive (a folder in the configuration directory). */
  keepInArchive: boolean;
};

export type ChromeSettings = {
  toolbar: boolean;
  statusBar: boolean;
  frame: boolean;
  epigraph: boolean;
};

export type NocturneSettings = {
  version: 1;
  theme: ThemeChoice;
  /** Hides frame, ornaments, status bar and all effects. */
  focusMode: boolean;
  /** Master switch for every visual effect (lighting, carriage motion, paper motion, afterimage). */
  effects: boolean;
  chrome: ChromeSettings;
  paper: PaperSettings;
  lighting: LightingSettings;
  typography: TypographySettings;
  typewriter: TypewriterSettings;
  print: PrintSettings;
};

/** Recursive partial used for settings patches. */
export type SettingsPatch = {
  [K in keyof NocturneSettings]?: NocturneSettings[K] extends object
    ? {[P in keyof NocturneSettings[K]]?: NocturneSettings[K][P]}
    : NocturneSettings[K];
};
