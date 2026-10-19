import test from 'ava';

import {contrast, isColor} from '../../app/nocturne/color';
import {ambientFloor} from '../../app/nocturne/lighting-math';
import {PAPER_IDS, PAPERS} from '../../app/nocturne/papers';
import {defaultSettings, sanitizeSettings} from '../../app/nocturne/settings';

test('six papers, cotton by default', (t) => {
  t.deepEqual(PAPER_IDS, ['cotton', 'laid', 'linen', 'onionskin', 'parchment', 'night']);
  t.is(defaultSettings().paper.style, 'cotton');
});

test('unknown paper styles fall back to the default', (t) => {
  t.is(sanitizeSettings({paper: {style: 'vellum', texture: 9}}).paper.style, 'cotton');
  t.is(sanitizeSettings({paper: {style: 'laid', texture: 9}}).paper.texture, 1.6);
});

for (const id of PAPER_IDS) {
  const paper = PAPERS[id];

  test(`${paper.name}: colours are valid and ink is highly readable`, (t) => {
    for (const value of [paper.paper, paper.ink, paper.inkMuted, paper.cursor, paper.selection]) {
      t.true(isColor(value), value);
    }
    t.true(contrast(paper.ink, paper.paper) >= 7);
    t.true(contrast(paper.inkMuted, paper.paper) >= 4.5);
  });

  test(`${paper.name}: ANSI colours stay readable`, (t) => {
    for (const [name, value] of Object.entries(paper.ansi)) {
      if (name === 'black' && paper.appearance === 'dark') continue;
      t.true(contrast(value, paper.paper) >= 3, `${name} ${value}`);
    }
  });

  test(`${paper.name}: the room may dim the paper only down to a readable floor`, (t) => {
    const floor = ambientFloor(paper.ink, paper.paper, 4.5);
    t.true(floor > 0 && floor < 1);
    const dim = (hex: string) => {
      const k = Math.round(floor * 255) / 255;
      const channels = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k));
      return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    };
    t.true(contrast(dim(paper.ink), dim(paper.paper)) >= 4.4);
  });
}
