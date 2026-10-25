import test from 'ava';

import {
  applyLightingPreset,
  applyTypographyPreset,
  defaultSettings,
  fontStack,
  isSafeFontFamily,
  LIGHTING_PRESETS,
  patchSettings,
  sanitizeSettings
} from '../../app/nocturne/settings';

test('defaults survive validation unchanged', (t) => {
  const defaults = defaultSettings();
  t.deepEqual(sanitizeSettings(defaults), defaults);
});

test('garbage input falls back to defaults', (t) => {
  for (const garbage of [undefined, null, 42, 'theme', [], {theme: 'neon', lighting: 'bright'}]) {
    t.deepEqual(sanitizeSettings(garbage), defaultSettings());
  }
});

test('unknown keys are dropped', (t) => {
  const result: Record<string, unknown> = {...sanitizeSettings({extra: true, lighting: {shader: 'void main(){}'}})};
  t.false('extra' in result);
  t.false('shader' in (result.lighting as Record<string, unknown>));
});

test('numbers are clamped and stepped', (t) => {
  const result = sanitizeSettings({
    lighting: {intensity: 99, spread: 3, reach: -1, grain: Number.NaN},
    typography: {fontSize: 400, letterSpacing: 2.6, fontWeight: 450, fontWeightBold: 200, lineHeight: 0.2}
  });
  t.is(result.lighting.intensity, 2);
  t.is(result.lighting.spread, 20);
  t.is(result.lighting.reach, 0.2);
  t.is(result.lighting.grain, defaultSettings().lighting.grain);
  t.is(result.typography.fontSize, 32);
  t.is(result.typography.letterSpacing, 3, 'letter spacing is whole pixels so every cell keeps one width');
  t.is(result.typography.fontWeight, 500);
  t.true(result.typography.fontWeightBold >= result.typography.fontWeight);
  t.is(result.typography.lineHeight, 1);
});

test('colours must match the strict grammar', (t) => {
  const result = sanitizeSettings({
    lighting: {color: 'red; background: url(https://example.com/x)'},
    typography: {selection: 'rgba(10, 20, 30, 0.4)'}
  });
  t.is(result.lighting.color, '');
  t.is(result.typography.selection, 'rgba(10, 20, 30, 0.4)');
});

test('custom font families are restricted to a safe grammar', (t) => {
  t.true(isSafeFontFamily('"Iosevka Term", monospace'));
  t.false(isSafeFontFamily('x; } body { display: none'));
  t.false(isSafeFontFamily('url(evil.woff)'));
  const result = sanitizeSettings({typography: {font: 'custom', customFamily: 'a{b}'}});
  t.is(result.typography.customFamily, '');
});

test('font stacks always end with monospace and CJK fallbacks', (t) => {
  for (const font of ['ibm-plex-mono', 'courier-prime', 'system', 'jetbrains-mono', 'custom'] as const) {
    const stack = fontStack({font, customFamily: ''});
    t.true(stack.endsWith('monospace'), font);
    t.true(stack.includes('Noto Sans Mono CJK SC'), font);
  }
  t.true(fontStack({font: 'ibm-plex-mono', customFamily: ''}).startsWith('"IBM Plex Mono"'));
});

test('patches merge into nested sections', (t) => {
  const result = patchSettings(defaultSettings(), {lighting: {intensity: 1.5}, typewriter: {sound: false}});
  t.is(result.lighting.intensity, 1.5);
  t.is(result.lighting.spread, defaultSettings().lighting.spread);
  t.false(result.typewriter.sound);
});

test('lighting presets: off disables, cinematic is stronger than balanced', (t) => {
  const base = defaultSettings();
  t.false(applyLightingPreset(base, 'off').lighting.enabled);
  const balanced = applyLightingPreset(base, 'balanced').lighting;
  const cinematic = applyLightingPreset(base, 'cinematic').lighting;
  t.is(cinematic.preset, 'cinematic');
  t.true(cinematic.intensity > balanced.intensity);
  t.true(cinematic.bloom > balanced.bloom);
  t.truthy(LIGHTING_PRESETS.balanced.enabled);
});

test('typography presets apply font and metrics', (t) => {
  const study = applyTypographyPreset(defaultSettings(), 'study').typography;
  t.is(study.font, 'ibm-plex-mono');
  t.is(study.preset, 'study');
});

test('lamp aim and the archive option are validated', (t) => {
  const result = sanitizeSettings({lighting: {aim: 300}, print: {keepInArchive: 'yes'}});
  t.is(result.lighting.aim, 45);
  t.true(result.print.keepInArchive);
  t.false(sanitizeSettings({print: {keepInArchive: false}}).print.keepInArchive);
});

test('every font stack carries the bundled Nerd Font symbols; custom names are quoted', (t) => {
  for (const font of ['courier-prime', 'ibm-plex-mono', 'jetbrains-mono-nf', 'system'] as const) {
    t.true(fontStack({font, customFamily: ''}).includes('"Symbols Nerd Font Mono"'), font);
  }
  t.true(fontStack({font: 'custom', customFamily: '3270 Nerd Font'}).startsWith('"3270 Nerd Font", '));
  t.true(fontStack({font: 'custom', customFamily: 'Iosevka, monospace'}).startsWith('Iosevka, monospace, '));
});
