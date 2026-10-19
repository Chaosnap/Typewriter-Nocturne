// Bridges Nocturne settings to Hyper's configuration.
//
// Colours and fonts reach xterm.js through Hyper's normal config → Redux → <Term> path, so the
// terminal renders exactly as it would with an equivalent hyper.json. Nothing here touches the
// terminal stream; it only produces a config object.

import type {configOptions} from '../../typings/config';

import {fontStack} from './settings';
import {THEMES} from './themes';
import type {NocturneSettings, NocturneTheme} from './types';

const CURSOR_SHAPES = {block: 'BLOCK', bar: 'BEAM', underline: 'UNDERLINE'} as const;

export function activeTheme(settings: NocturneSettings): NocturneTheme | null {
  return settings.theme === 'classic' ? null : THEMES[settings.theme];
}

/** Paper margins around the text grid, inside the sheet. */
export function paperPadding(settings: NocturneSettings): string {
  if (settings.theme === 'classic') {
    return '';
  }
  return settings.focusMode ? '10px 14px' : '22px 30px 18px';
}

/** xterm.js options that Hyper does not expose through its config. */
export function extraTerminalOptions(settings: NocturneSettings) {
  return {
    cursorWidth: settings.typography.cursorWidth,
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
    cursorBlink: typography.cursorBlink
  };

  const theme = activeTheme(settings);
  if (!theme) {
    return next;
  }

  const {palette} = theme;
  return {
    ...next,
    foregroundColor: palette.ink,
    backgroundColor: palette.paper,
    cursorColor: palette.cursor,
    cursorAccentColor: palette.cursorAccent,
    selectionColor: typography.selection || palette.selection,
    borderColor: palette.border,
    padding: paperPadding(settings),
    colors: {...config.colors, ...palette.ansi}
  };
}

/** A key that changes only when the produced config would change (avoids needless reloads). */
export function configAffectingKey(settings: NocturneSettings): string {
  return JSON.stringify([settings.theme, settings.focusMode, settings.typography]);
}
