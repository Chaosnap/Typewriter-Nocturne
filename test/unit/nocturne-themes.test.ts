import test from 'ava';

import {applyNocturneToConfig, configAffectingKey} from '../../app/nocturne/apply-config';
import {contrast, isColor} from '../../app/nocturne/color';
import {defaultSettings, patchSettings} from '../../app/nocturne/settings';
import {THEME_IDS, THEMES} from '../../app/nocturne/themes';
import type {configOptions} from '../../typings/config';

const collectColors = (value: unknown, path: string[] = []): [string, string][] => {
  if (typeof value === 'string') {
    return [[path.join('.'), value]];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => collectColors(child, [...path, key]));
  }
  return [];
};

test('there are three themes', (t) => {
  t.deepEqual(THEME_IDS, ['paper-and-ink', 'midnight-study', 'moonlit-poetry']);
});

for (const id of THEME_IDS) {
  const theme = THEMES[id];

  test(`${theme.name}: every palette and material colour is valid`, (t) => {
    const colours = collectColors({palette: theme.palette, material: theme.material, light: theme.light.color});
    for (const [name, value] of colours) {
      if (name.endsWith('.frame')) continue;
      t.true(isColor(value), `${name} = ${value}`);
    }
  });

  test(`${theme.name}: ink is highly readable on paper`, (t) => {
    t.true(contrast(theme.palette.ink, theme.palette.paper) >= 7);
    t.true(contrast(theme.palette.inkMuted, theme.palette.paper) >= 4.5);
  });

  test(`${theme.name}: ANSI colours stay readable on paper`, (t) => {
    for (const [name, value] of Object.entries(theme.palette.ansi)) {
      if (name === 'black' && theme.appearance === 'dark') continue;
      t.true(contrast(value, theme.palette.paper) >= 3, `${name} ${value}`);
    }
  });
}

const baseConfig = {
  fontFamily: 'Menlo',
  fontSize: 12,
  foregroundColor: '#fff',
  backgroundColor: '#000',
  colors: {limeGreen: '#32CD32'}
} as unknown as configOptions;

test('a Nocturne theme drives xterm colours and fonts through the config', (t) => {
  const settings = defaultSettings();
  const result = applyNocturneToConfig(baseConfig, settings);
  t.is(result.backgroundColor, THEMES['paper-and-ink'].palette.paper);
  t.is(result.foregroundColor, THEMES['paper-and-ink'].palette.ink);
  t.is(result.colors.red, THEMES['paper-and-ink'].palette.ansi.red);
  t.is((result.colors as unknown as Record<string, string>).limeGreen, '#32CD32');
  t.true(result.fontFamily.startsWith('"IBM Plex Mono"'));
  t.is(result.fontSize, settings.typography.fontSize);
  t.is(result.cursorShape, 'BLOCK');
});

test('the classic theme keeps colours from hyper.json', (t) => {
  const settings = patchSettings(defaultSettings(), {theme: 'classic'});
  const result = applyNocturneToConfig(baseConfig, settings);
  t.is(result.backgroundColor, '#000');
  t.is(result.foregroundColor, '#fff');
});

test('lighting changes do not force a config reload', (t) => {
  const settings = defaultSettings();
  const brighter = patchSettings(settings, {lighting: {intensity: 1.9}});
  t.is(configAffectingKey(settings), configAffectingKey(brighter));
  const larger = patchSettings(settings, {typography: {fontSize: 18}});
  t.not(configAffectingKey(settings), configAffectingKey(larger));
});
