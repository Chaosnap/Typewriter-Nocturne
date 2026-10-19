import test from 'ava';

import {softLight, toUnit} from '../../app/nocturne/color';
import {glowSource, lightingLimits, lightSource, litContrast, shadeSource} from '../../app/nocturne/lighting-math';
import {THEME_IDS, THEMES} from '../../app/nocturne/themes';

const NEUTRAL: [number, number, number] = [0.5, 0.5, 0.5];
const NO_GLOW: [number, number, number] = [0, 0, 0];

test('soft-light at 0.5 leaves the terminal unchanged', (t) => {
  for (const value of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
    t.true(Math.abs(softLight(value, 0.5) - value) < 1e-9);
  }
});

test('soft-light brightens above 0.5 and darkens below', (t) => {
  t.true(softLight(0.4, 0.9) > 0.4);
  t.true(softLight(0.4, 0.1) < 0.4);
});

for (const id of THEME_IDS) {
  const theme = THEMES[id];
  const {ink, paper} = theme.palette;
  const tintColor = theme.light.color;
  const peak = Math.max(...toUnit(tintColor));
  const tint = toUnit(tintColor).map((channel) => channel / peak) as [number, number, number];

  for (const minRatio of [4.5, 7]) {
    test(`${theme.name}: each lighting layer at its limit keeps ink/paper contrast >= ${minRatio}:1`, (t) => {
      const limits = lightingLimits(ink, paper, tintColor, minRatio);
      for (const value of [limits.light, limits.shade, limits.glow]) {
        t.true(value >= 0 && value <= 1);
      }
      const target = Math.min(minRatio, litContrast(ink, paper, NEUTRAL, NO_GLOW));
      t.true(litContrast(ink, paper, lightSource(limits.light, tint), NO_GLOW) >= target - 0.01);
      t.true(litContrast(ink, paper, shadeSource(limits.shade), NO_GLOW) >= target - 0.01);
      t.true(litContrast(ink, paper, NEUTRAL, glowSource(limits.glow, tint)) >= target - 0.01);
    });
  }
}

test('a minimum ratio of 1 allows full-strength lighting', (t) => {
  const {ink, paper} = THEMES['midnight-study'].palette;
  t.deepEqual(lightingLimits(ink, paper, '#ffb35c', 1), {light: 1, shade: 1, glow: 1});
});

test('demanding the unlit contrast forbids any glow on ivory paper', (t) => {
  const {ink, paper} = THEMES['paper-and-ink'].palette;
  t.true(lightingLimits(ink, paper, '#ffffff', 21).glow < 0.01);
});
