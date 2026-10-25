import test from 'ava';

import {
  activePaper,
  applyNocturneToConfig,
  blockCursorOn,
  configAffectingKey,
  inkSelectionOn,
  lightOn,
  paperEffectsOn,
  quillCursorOn
} from '../../app/nocturne/apply-config';
import {contrast, isColor} from '../../app/nocturne/color';
import {PAPERS} from '../../app/nocturne/papers';
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

test('the paper drives xterm colours, the settings drive fonts', (t) => {
  const settings = defaultSettings();
  const result = applyNocturneToConfig(baseConfig, settings);
  t.is(result.backgroundColor, PAPERS.onionskin.paper);
  t.is(result.foregroundColor, PAPERS.onionskin.ink);
  t.is(result.colors.red, PAPERS.onionskin.ansi.red);
  t.is((result.colors as unknown as Record<string, string>).limeGreen, '#32CD32');
  t.true(result.fontFamily.startsWith('"Courier Prime"'));
  t.is(result.fontSize, settings.typography.fontSize);
  // Nocturne draws the ink block over xterm's transparent bar.
  t.is(result.cursorShape, 'BEAM');
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

test('changing the paper changes the terminal colours', (t) => {
  const night = applyNocturneToConfig(baseConfig, patchSettings(defaultSettings(), {paper: {style: 'night'}}));
  t.is(night.backgroundColor, PAPERS.night.paper);
  t.is(night.foregroundColor, PAPERS.night.ink);
});

test('focus mode can lay the text on the night paper or on a colour of its own', (t) => {
  const focus = patchSettings(defaultSettings(), {focusMode: true});
  t.is(activePaper(focus).paper, PAPERS[focus.paper.style].paper);
  t.is(activePaper(patchSettings(focus, {focus: {background: 'dark'}})).paper, PAPERS.night.paper);
  const deep = activePaper(patchSettings(focus, {focus: {background: 'custom', color: '#102030'}}));
  t.is(deep.paper, '#102030');
  t.is(deep.ink, PAPERS.night.ink);
  const pale = activePaper(patchSettings(focus, {focus: {background: 'custom', color: '#f0f4f8'}}));
  t.is(pale.ink, PAPERS.cotton.ink);
  // Outside focus mode the focus background does nothing.
  const normal = patchSettings(defaultSettings(), {focus: {background: 'dark'}});
  t.is(activePaper(normal).paper, PAPERS[normal.paper.style].paper);
});

test('focus mode keeps paper effects and drops the light unless asked', (t) => {
  const focus = patchSettings(defaultSettings(), {focusMode: true});
  t.true(paperEffectsOn(focus));
  t.false(lightOn(focus));
  t.true(lightOn(patchSettings(focus, {focus: {lighting: true}})));
  t.false(paperEffectsOn(patchSettings(focus, {focus: {paper: false}})));
  t.true(lightOn(defaultSettings()));
});

test('the ink selection hides the selection box, the classic one keeps it', (t) => {
  const ink = applyNocturneToConfig(baseConfig, defaultSettings());
  t.true(inkSelectionOn(defaultSettings()));
  t.is(ink.selectionColor, 'rgba(0, 0, 0, 0)');
  const classic = patchSettings(defaultSettings(), {typography: {selectionStyle: 'classic'}});
  t.false(inkSelectionOn(classic));
  t.not(applyNocturneToConfig(baseConfig, classic).selectionColor, 'rgba(0, 0, 0, 0)');
});

test("under the ink block and the quill xterm keeps a transparent bar; Hyper's own look keeps its cursor", (t) => {
  const block = applyNocturneToConfig(baseConfig, defaultSettings());
  t.true(blockCursorOn(defaultSettings()));
  t.false(quillCursorOn(defaultSettings()));
  t.is(block.cursorShape, 'BEAM');
  t.is(block.cursorColor, 'rgba(0, 0, 0, 0)');
  t.false(block.cursorBlink);
  const quillSettings = patchSettings(defaultSettings(), {typography: {cursorStyle: 'quill'}});
  const quill = applyNocturneToConfig(baseConfig, quillSettings);
  t.true(quillCursorOn(quillSettings));
  t.false(blockCursorOn(quillSettings));
  t.is(quill.cursorShape, 'BEAM');
  t.is(quill.cursorColor, 'rgba(0, 0, 0, 0)');
  const classic = patchSettings(defaultSettings(), {theme: 'classic'});
  t.false(blockCursorOn(classic));
  t.is(applyNocturneToConfig(baseConfig, classic).cursorShape, 'BLOCK');
  t.not(applyNocturneToConfig(baseConfig, classic).cursorColor, 'rgba(0, 0, 0, 0)');
  const classicQuill = patchSettings(classic, {typography: {cursorStyle: 'quill'}});
  t.false(quillCursorOn(classicQuill));
  t.is(applyNocturneToConfig(baseConfig, classicQuill).cursorShape, 'BEAM');
});
