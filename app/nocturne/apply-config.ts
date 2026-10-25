// Bridges Nocturne settings to Hyper's configuration.
//
// Colours and fonts reach xterm.js through Hyper's normal config → Redux → <Term> path, so the
// terminal renders exactly as it would with an equivalent hyper.json. Nothing here touches the
// terminal stream; it only produces a config object.

import type {configOptions} from '../../typings/config';

import {luminanceOfUnit, toUnit} from './color';
import {PAPERS} from './papers';
import type {Paper} from './papers';
import {fontStack} from './settings';
import {THEMES} from './themes';
import type {NocturneSettings, NocturneTheme} from './types';

// The quill is drawn by Nocturne over a thin bar; with Hyper's own look (classic) the bar shows.
const CURSOR_SHAPES = {quill: 'BEAM', block: 'BLOCK', bar: 'BEAM', underline: 'UNDERLINE'} as const;

export function activeTheme(settings: NocturneSettings): NocturneTheme | null {
  return settings.theme === 'classic' ? null : THEMES[settings.theme];
}

/**
 * The sheet the terminal is typed on. In Focus Mode it can be the night paper or a colour of the
 * user's own; a custom colour takes the light or the night paper's inks, whichever reads on it.
 */
export function activePaper(settings: NocturneSettings): Paper {
  const chosen = PAPERS[settings.paper.style];
  if (!settings.focusMode || settings.focus.background === 'paper') {
    return chosen;
  }
  if (settings.focus.background === 'dark') {
    return PAPERS.night;
  }
  const dark = luminanceOfUnit(toUnit(settings.focus.color)) < 0.18;
  const inks = dark ? PAPERS.night : PAPERS.cotton;
  return {...inks, paper: settings.focus.color, surface: {...inks.surface, mottle: 0, age: 0}};
}

/** Paper texture and type impressions are drawn (in Focus Mode only if the user keeps them). */
export function paperEffectsOn(settings: NocturneSettings): boolean {
  return settings.theme !== 'classic' && settings.effects && (!settings.focusMode || settings.focus.paper);
}

/** The lamp's light is drawn (in Focus Mode only if the user keeps it). */
export function lightOn(settings: NocturneSettings): boolean {
  const allowed = !settings.focusMode || settings.focus.lighting;
  return settings.theme !== 'classic' && settings.effects && settings.lighting.enabled && allowed;
}

/** The ink selection effect replaces xterm's selection box. */
export function inkSelectionOn(settings: NocturneSettings): boolean {
  return paperEffectsOn(settings) && settings.typography.selectionStyle === 'ink';
}

/** Paper margins around the text grid, inside the sheet. */
export function paperPadding(settings: NocturneSettings): string {
  if (settings.theme === 'classic') {
    return '';
  }
  return settings.focusMode ? '10px 14px' : '26px 34px 10px';
}

/** The quill cursor is drawn: the Nocturne look with the quill chosen. */
export function quillCursorOn(settings: NocturneSettings): boolean {
  return settings.theme !== 'classic' && settings.typography.cursorStyle === 'quill';
}

/** xterm.js options that Hyper does not expose through its config. */
export function extraTerminalOptions(settings: NocturneSettings) {
  return {
    cursorWidth: quillCursorOn(settings) ? 1 : settings.typography.cursorWidth,
    minimumContrastRatio: settings.typography.minimumContrast
  };
}

export function applyNocturneToConfig<T extends configOptions>(config: T, settings: NocturneSettings): T {
  const {typography} = settings;
  const next: T = {
    ...config,
    fontFamily: fontStack(typography),
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    fontWeightBold: typography.fontWeightBold,
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
    disableLigatures: !typography.ligatures,
    cursorShape: CURSOR_SHAPES[typography.cursorStyle],
    // The quill breathes on its own; xterm's hidden bar under it need not blink.
    cursorBlink: typography.cursorBlink && !quillCursorOn(settings)
  };

  const theme = activeTheme(settings);
  if (!theme) {
    return next;
  }

  // The paper supplies the terminal's colours; the theme supplies room, light and metal.
  const paper = activePaper(settings);
  return {
    ...next,
    foregroundColor: paper.ink,
    backgroundColor: paper.paper,
    // Under the quill, xterm's cursor is a bar in a transparent colour: present, never seen.
    cursorColor: quillCursorOn(settings) ? 'rgba(0, 0, 0, 0)' : paper.cursor,
    cursorAccentColor: paper.paper,
    // With the ink selection the effect layer draws the selection; xterm's box stays invisible.
    selectionColor: inkSelectionOn(settings) ? 'rgba(0, 0, 0, 0)' : typography.selection || paper.selection,
    borderColor: theme.palette.border,
    padding: paperPadding(settings),
    colors: {...config.colors, ...paper.ansi}
  };
}

/** A key that changes only when the produced config would change (avoids needless reloads). */
export function configAffectingKey(settings: NocturneSettings): string {
  const paper = activePaper(settings);
  const key = [settings.theme, settings.focusMode, settings.typography, paper.paper, inkSelectionOn(settings)];
  return JSON.stringify(key);
}
