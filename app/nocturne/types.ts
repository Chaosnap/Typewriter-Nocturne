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
/** `quill`: a quill pen at the insertion point, drawn over xterm's own (invisible) cursor. */
export type CursorStyle = 'quill' | 'block' | 'bar' | 'underline';
export type TypewriterVoice = 'standard' | 'portable' | 'electric' | 'whisper';

/** `pointed`: the beam narrows to the bulb; `soft`: it opens softly round it, as a large bulb's does. */
export type BeamShape = 'pointed' | 'soft';

/** The window the moonlight comes through, as its light falls on the sheet. */
export type WindowSettings = {
  /** Panes across and down, 1–6. */
  columns: number;
  rows: number;
  /** How far the light slants the window, in degrees; 0 casts it upright. */
  slant: number;
  /** Centre of the window's light on the sheet, as a share of its width and height. */
  x: number;
  y: number;
};

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
  beam: BeamShape;
  /** Where the lamp points, swivelled left (−) or right (+) in degrees. */
  aim: number;
  /** 0.2–2, shown as a percentage of the sheet height. */
  reach: number;
  /** Normalised position (desk lamp, moonlight). */
  position: {x: number; y: number};
  /** The moonlit window's panes, slant and place. */
  window: WindowSettings;
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
  /** `ink`: selected text dissolves like ink and re-forms under a soft wash; `classic`: xterm's box. */
  selectionStyle: SelectionStyle;
};

export type SelectionStyle = 'ink' | 'classic';

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
  /** Width of the sheet in the typewriter: 0 is the narrowest, 1 runs the full length of the platen. */
  width: number;
};

export type FolioPaperId = 'laid' | 'cotton' | 'vellum' | 'parchment' | 'night';
export type SealColor = 'crimson' | 'oxblood' | 'black' | 'gold' | 'emerald' | 'sapphire';
export type SealEmblem = 'moon' | 'rose' | 'quill' | 'none';
/**
 * How the silk is laid under the seal: `tails` two swallowtails; `loop` a loop above and two tails;
 * `band` one band down through the seal; `cross` two bands crossed; `banner` a band from above and
 * two tails below; `pendant` a band from above falling in two long tails.
 */
export type RibbonStyle = 'tails' | 'loop' | 'band' | 'cross' | 'banner' | 'pendant';
/** The colour of the silk; `wax` is the silk that goes with the wax. */
export type RibbonColor = 'wax' | 'crimson' | 'burgundy' | 'navy' | 'emerald' | 'gold' | 'ivory' | 'black';
/** `sonnet`: an upright book face, as sonnets are printed; `custom`: `customFont`. */
export type FolioFont = 'typewriter' | 'sonnet' | 'display' | 'plex' | 'terminal' | 'custom';

/** How a folio is printed: its paper, its seal, the face of its text and the signature. */
export type FolioStyle = {
  paper: FolioPaperId;
  sealColor: SealColor;
  /** One or two letters pressed into the seal. */
  monogram: string;
  emblem: SealEmblem;
  /** The folio is sealed in wax at all. */
  seal: boolean;
  /** The silk ribbon under the seal. */
  ribbon: boolean;
  ribbonStyle: RibbonStyle;
  ribbonColor: RibbonColor;
  font: FolioFont;
  customFont: string;
  /** "set at the typewriter, by …"; empty = "by lamplight". */
  signature: string;
};

export type PrintSettings = {
  /** Printed pages are kept in the Archive (a folder in the configuration directory). */
  keepInArchive: boolean;
  style: FolioStyle;
};

export type ChromeSettings = {
  toolbar: boolean;
  statusBar: boolean;
  frame: boolean;
  epigraph: boolean;
  /** The lamp's pull cord at the top left (never shown in Focus Mode). */
  pullCord: boolean;
};

/** The sheet in Focus Mode: the chosen paper, the night paper, or a colour of your own. */
export type FocusBackground = 'paper' | 'dark' | 'custom';

export type FocusSettings = {
  background: FocusBackground;
  /** Used when `background` is `custom`. */
  color: string;
  /** Paper texture and type impressions stay on in Focus Mode. */
  paper: boolean;
  /** The light stays on in Focus Mode. */
  lighting: boolean;
};

/** `clip`: a paper clip on the sheet's edge; `bar`: a translucent bar; `native`: the system's. */
export type ScrollbarStyle = 'clip' | 'bar' | 'native';
export type ClipFinish = 'silver' | 'brass' | 'gold' | 'black';

export type ScrollbarSettings = {
  style: ScrollbarStyle;
  finish: ClipFinish;
  /** The translucent bar: opacity 0.1–0.9, width 3–12 px. */
  barOpacity: number;
  barWidth: number;
};

export type NocturneSettings = {
  version: 3;
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
  focus: FocusSettings;
  scrollbar: ScrollbarSettings;
};

/** Recursive partial used for settings patches. */
export type SettingsPatch = {
  [K in keyof NocturneSettings]?: NocturneSettings[K] extends object
    ? {[P in keyof NocturneSettings[K]]?: NocturneSettings[K][P]}
    : NocturneSettings[K];
};
