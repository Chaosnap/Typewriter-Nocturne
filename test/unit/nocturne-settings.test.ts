import test from 'ava';

import {
  applyLightingPreset,
  applyTypographyPreset,
  defaultSettings,
  folioFontStack,
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

test('the pull cord, the scrollbar and the selection style are validated', (t) => {
  const defaults = defaultSettings();
  t.true(defaults.chrome.pullCord);
  t.is(defaults.scrollbar.style, 'clip');
  t.is(defaults.typography.selectionStyle, 'ink');
  const result = sanitizeSettings({
    chrome: {pullCord: false},
    scrollbar: {style: 'bar', finish: 'chrome', barOpacity: 5, barWidth: 1},
    typography: {selectionStyle: 'neon'}
  });
  t.false(result.chrome.pullCord);
  t.is(result.scrollbar.style, 'bar');
  t.is(result.scrollbar.finish, 'silver');
  t.true(result.scrollbar.barOpacity <= 0.9);
  t.true(result.scrollbar.barWidth >= 3);
  t.is(result.typography.selectionStyle, 'ink');
});

test('focus mode keeps its own background and effects', (t) => {
  t.deepEqual(defaultSettings().focus, {background: 'paper', color: '#1c1916', paper: true, lighting: false});
  const result = sanitizeSettings({focus: {background: 'custom', color: 'url(x)', paper: 'no', lighting: true}});
  t.is(result.focus.background, 'custom');
  t.is(result.focus.color, '#1c1916');
  t.true(result.focus.paper);
  t.true(result.focus.lighting);
  t.is(sanitizeSettings({focus: {background: 'video'}}).focus.background, 'paper');
});

test('print style patches replace the style as a whole', (t) => {
  const style = {...defaultSettings().print.style, paper: 'vellum' as const, signature: 'Yuki'};
  const result = patchSettings(defaultSettings(), {print: {style}});
  t.is(result.print.style.paper, 'vellum');
  t.is(result.print.style.signature, 'Yuki');
  t.true(result.print.keepInArchive);
});

test('folio faces: book serifs for verse, safe custom families only', (t) => {
  const typography = {font: 'ibm-plex-mono', customFamily: ''} as const;
  t.true(folioFontStack({font: 'sonnet', customFont: ''}, typography).family.startsWith('"EB Garamond"'));
  t.true(folioFontStack({font: 'typewriter', customFont: ''}, typography).family.startsWith('"Courier Prime"'));
  t.true(folioFontStack({font: 'custom', customFont: 'Baskerville'}, typography).family.startsWith('"Baskerville"'));
  t.true(folioFontStack({font: 'custom', customFont: 'x;}'}, typography).family.startsWith('"Courier Prime"'));
  t.is(folioFontStack({font: 'terminal', customFont: ''}, typography).family, fontStack(typography));
});

test('the quill is the cursor; settings from before it had the block, which becomes the quill', (t) => {
  t.is(defaultSettings().typography.cursorStyle, 'quill');
  t.is(sanitizeSettings({version: 1, typography: {cursorStyle: 'block'}}).typography.cursorStyle, 'quill');
  t.is(sanitizeSettings({version: 2, typography: {cursorStyle: 'block'}}).typography.cursorStyle, 'block');
  t.is(sanitizeSettings({version: 1, typography: {cursorStyle: 'bar'}}).typography.cursorStyle, 'bar');
  t.is(sanitizeSettings({typography: {cursorStyle: 'feather'}}).typography.cursorStyle, 'quill');
});

test('the beam is pointed unless chosen soft; a folio is sealed unless chosen otherwise', (t) => {
  t.is(defaultSettings().lighting.beam, 'pointed');
  t.is(sanitizeSettings({lighting: {beam: 'soft'}}).lighting.beam, 'soft');
  t.is(sanitizeSettings({lighting: {beam: 'wide'}}).lighting.beam, 'pointed');
  t.true(defaultSettings().print.style.seal);
  t.false(sanitizeSettings({print: {style: {seal: false}}}).print.style.seal);
});

test('the moonlit window is upright by default; its panes, slant and place are kept in range', (t) => {
  t.deepEqual(defaultSettings().lighting.window, {columns: 3, rows: 2, slant: 0, x: 0.34, y: 0.25});
  const result = sanitizeSettings({lighting: {window: {columns: 40, rows: 0, slant: -90, x: 2, y: 'top'}}});
  t.deepEqual(result.lighting.window, {columns: 6, rows: 1, slant: -35, x: 1, y: 0.25});
});

test('the sheet is narrowest by default and at most as wide as the platen; the ribbon is laid six ways', (t) => {
  t.is(defaultSettings().paper.width, 0);
  t.is(sanitizeSettings({paper: {width: 3}}).paper.width, 1);
  t.is(sanitizeSettings({paper: {width: -1}}).paper.width, 0);
  t.is(defaultSettings().print.style.ribbonStyle, 'tails');
  t.is(sanitizeSettings({print: {style: {ribbonStyle: 'cross'}}}).print.style.ribbonStyle, 'cross');
  t.is(sanitizeSettings({print: {style: {ribbonStyle: 'bow'}}}).print.style.ribbonStyle, 'tails');
});

test('the balanced preset brings back the pointed beam, straight up the page', (t) => {
  const custom = patchSettings(defaultSettings(), {lighting: {beam: 'soft', aim: 30, spread: 140, preset: 'custom'}});
  const balanced = applyLightingPreset(custom, 'balanced').lighting;
  t.is(balanced.beam, 'pointed');
  t.is(balanced.aim, 0);
  t.is(balanced.spread, 74);
});
