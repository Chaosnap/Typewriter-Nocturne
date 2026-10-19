// Paper is chosen independently of the theme: the theme sets the room, the light and the metal,
// the paper sets the terminal's background, ink colours and surface relief. Contrast of every ink
// colour on every paper is checked by test/unit/nocturne-papers.test.ts.

import type {AnsiColors, PaperId} from './types';

export type Paper = {
  id: PaperId;
  name: string;
  appearance: 'light' | 'dark';
  /** Terminal background. */
  paper: string;
  ink: string;
  inkMuted: string;
  cursor: string;
  selection: string;
  ansi: AnsiColors;
  /** Surface parameters for the paper shader, 0–1. */
  surface: {crinkle: number; laid: number; linen: number; mottle: number; age: number};
};

const LIGHT_ANSI: AnsiColors = {
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
};

const NIGHT_ANSI: AnsiColors = {
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
};

const lightPaper = (id: PaperId, name: string, paper: string, surface: Paper['surface']): Paper => ({
  id,
  name,
  appearance: 'light',
  paper,
  ink: '#2a2019',
  inkMuted: '#6b5f52',
  cursor: '#3a2c20',
  selection: 'rgba(176, 138, 74, 0.3)',
  ansi: LIGHT_ANSI,
  surface
});

export const PAPERS: Record<PaperId, Paper> = {
  cotton: lightPaper('cotton', 'Cotton', '#eee6d5', {crinkle: 0.55, laid: 0, linen: 0, mottle: 0.12, age: 0}),
  laid: lightPaper('laid', 'Laid', '#f1e9d6', {crinkle: 0.22, laid: 1, linen: 0, mottle: 0.18, age: 0}),
  linen: lightPaper('linen', 'Linen', '#ebe5d8', {crinkle: 0.2, laid: 0, linen: 1, mottle: 0.08, age: 0}),
  onionskin: lightPaper('onionskin', 'Onionskin', '#f2f1ea', {crinkle: 0.08, laid: 0, linen: 0, mottle: 0.04, age: 0}),
  parchment: lightPaper('parchment', 'Parchment', '#efdfbd', {crinkle: 0.25, laid: 0, linen: 0, mottle: 1, age: 0.75}),
  night: {
    id: 'night',
    name: 'Night',
    appearance: 'dark',
    paper: '#1d1a20',
    ink: '#e6e1ea',
    inkMuted: '#9a94a6',
    cursor: '#e9e7ff',
    selection: 'rgba(160, 168, 214, 0.28)',
    ansi: NIGHT_ANSI,
    surface: {crinkle: 0.3, laid: 0, linen: 0, mottle: 0.1, age: 0}
  }
};

export const PAPER_IDS = Object.keys(PAPERS) as PaperId[];

export const isPaperId = (value: unknown): value is PaperId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PAPERS, value);
