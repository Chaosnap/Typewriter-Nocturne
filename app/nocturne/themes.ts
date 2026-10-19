// The three Typewriter Nocturne themes. Every colour here is original; contrast against the
// paper is verified by test/unit/nocturne-themes.test.ts (ink ≥ 7:1, ANSI colours ≥ 3:1).

import type {NocturneTheme, ThemeId} from './types';

export const paperAndInk: NocturneTheme = {
  id: 'paper-and-ink',
  name: 'Paper & Ink',
  epithet: 'Warm ivory, antique ink, a walnut desk at dusk.',
  appearance: 'light',
  palette: {
    room: '#241a14',
    roomEdge: '#070504',
    paper: '#f4ecdb',
    paperEdge: '#e1d1b0',
    paperShadow: 'rgba(24, 14, 6, 0.55)',
    ink: '#2b231c',
    inkMuted: '#6e6153',
    inkFaint: '#a89a85',
    accent: '#b08a4a',
    accentSoft: '#d9c08a',
    cursor: '#3a2c20',
    cursorAccent: '#f4ecdb',
    selection: 'rgba(176, 138, 74, 0.3)',
    border: '#c9b48e',
    ansi: {
      black: '#2b231c',
      red: '#9c3a2a',
      green: '#4c6b2f',
      yellow: '#8a6a1c',
      blue: '#2f5277',
      magenta: '#7b3f6e',
      cyan: '#2e6b6a',
      white: '#7d7060',
      lightBlack: '#6e6153',
      lightRed: '#b0452a',
      lightGreen: '#557a33',
      lightYellow: '#94701a',
      lightBlue: '#3a6491',
      lightMagenta: '#8c4a7e',
      lightCyan: '#317876',
      lightWhite: '#5b4f43'
    }
  },
  material: {
    frame: 'walnut',
    grain: 0.07,
    metal: '#b8904c',
    metalHighlight: '#f3dca4',
    metalShadow: '#5e431c',
    ribbon: '#8e2f25',
    radius: {window: 12, paper: 6, control: 6}
  },
  light: {
    source: 'carriage',
    color: '#ffd29a',
    position: {x: 0.5, y: 1},
    shade: 0.42
  },
  atmosphere: {particles: 0.1, filmGrain: 0.08, vignette: 0.35},
  scene: {trim: '#c9a35c', environment: 0.55, exposure: 1},
  motion: 1
};

export const midnightStudy: NocturneTheme = {
  id: 'midnight-study',
  name: 'Midnight Study',
  epithet: 'Charcoal and walnut under an amber desk lamp.',
  appearance: 'dark',
  palette: {
    room: '#140f0b',
    roomEdge: '#030202',
    paper: '#1c1714',
    paperEdge: '#2c241e',
    paperShadow: 'rgba(0, 0, 0, 0.7)',
    ink: '#eadfc8',
    inkMuted: '#a39580',
    inkFaint: '#6b5f52',
    accent: '#c9a45c',
    accentSoft: '#8a6f3d',
    cursor: '#f2b45c',
    cursorAccent: '#1c1714',
    selection: 'rgba(201, 164, 92, 0.3)',
    border: '#3a2f27',
    ansi: {
      black: '#2b241f',
      red: '#d2765c',
      green: '#a3b46a',
      yellow: '#e3b25c',
      blue: '#7f9fc2',
      magenta: '#c48aa8',
      cyan: '#7fb3a8',
      white: '#d8ccb6',
      lightBlack: '#7a6c60',
      lightRed: '#e8907a',
      lightGreen: '#bccb84',
      lightYellow: '#f2c97a',
      lightBlue: '#9cb9d8',
      lightMagenta: '#d7a3bf',
      lightCyan: '#9ccbc0',
      lightWhite: '#f6eedd'
    }
  },
  material: {
    frame: 'charcoal',
    grain: 0.05,
    metal: '#c9a45c',
    metalHighlight: '#f4dca0',
    metalShadow: '#4f3a17',
    ribbon: '#7a2a20',
    radius: {window: 12, paper: 8, control: 6}
  },
  light: {
    source: 'desk-lamp',
    color: '#ffb35c',
    position: {x: 0.84, y: 0.04},
    shade: 0.5
  },
  atmosphere: {particles: 0.2, filmGrain: 0.12, vignette: 0.6},
  scene: {trim: '#c9a45c', environment: 0.32, exposure: 0.9},
  motion: 1
};

export const moonlitPoetry: NocturneTheme = {
  id: 'moonlit-poetry',
  name: 'Moonlit Poetry',
  epithet: 'Violet night, cool moonlight, silver and ink.',
  appearance: 'dark',
  palette: {
    room: '#0e0e1a',
    roomEdge: '#030307',
    paper: '#171826',
    paperEdge: '#26283e',
    paperShadow: 'rgba(0, 0, 8, 0.7)',
    ink: '#dcdcec',
    inkMuted: '#9496b4',
    inkFaint: '#5c5e7c',
    accent: '#b7bdd6',
    accentSoft: '#6e7396',
    cursor: '#e9e7ff',
    cursorAccent: '#171826',
    selection: 'rgba(160, 168, 214, 0.28)',
    border: '#2c2e48',
    ansi: {
      black: '#2a2b42',
      red: '#d88a9a',
      green: '#9cc3a4',
      yellow: '#e2cf9a',
      blue: '#8ea8e0',
      magenta: '#b79ce0',
      cyan: '#8cc8d6',
      white: '#c9cadf',
      lightBlack: '#6f7192',
      lightRed: '#eba5b3',
      lightGreen: '#b4d8bc',
      lightYellow: '#efdfb2',
      lightBlue: '#aac0ef',
      lightMagenta: '#cbb5ef',
      lightCyan: '#a8dbe6',
      lightWhite: '#f0f0fa'
    }
  },
  material: {
    frame: 'slate',
    grain: 0.05,
    metal: '#aeb4c8',
    metalHighlight: '#eef0fa',
    metalShadow: '#3e4258',
    ribbon: '#4a3f7a',
    radius: {window: 12, paper: 8, control: 6}
  },
  light: {
    source: 'moonlight',
    color: '#c9d4ff',
    position: {x: 0.14, y: -0.1},
    shade: 0.48
  },
  atmosphere: {particles: 0.35, filmGrain: 0.1, vignette: 0.55},
  scene: {trim: '#b7bdd6', environment: 0.3, exposure: 0.85},
  motion: 1.15
};

export const THEMES: Record<ThemeId, NocturneTheme> = {
  'paper-and-ink': paperAndInk,
  'midnight-study': midnightStudy,
  'moonlit-poetry': moonlitPoetry
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value);
