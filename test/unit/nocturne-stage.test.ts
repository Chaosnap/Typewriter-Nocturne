import test from 'ava';

import {stageLayout} from '../../app/nocturne/stage-layout';

const SIZES: [number, number][] = [
  [1280, 786],
  [820, 526],
  [1920, 1046],
  [600, 400]
];

for (const [width, height] of SIZES) {
  test(`${width}×${height}: text ends above the bail, the sheet is centred and runs behind the platen`, (t) => {
    const layout = stageLayout(width, height, true);
    t.true(layout.text.y + layout.text.height < layout.bailY, 'no character under the bail');
    t.true(layout.bailY < layout.platenY && layout.platenY < height);
    t.true(layout.sheet.y + layout.sheet.height >= layout.platenY);
    const right = width - (layout.sheet.x + layout.sheet.width);
    t.true(Math.abs(layout.sheet.x - right) <= 1, 'centred');
    t.true(layout.sheet.width <= 1240);
    t.true(layout.text.height >= 80);
  });
}

test('without the machine the sheet and the text fill the stage', (t) => {
  const layout = stageLayout(1000, 700, false);
  t.false(layout.machine);
  t.deepEqual(layout.sheet, {x: 0, y: 0, width: 1000, height: 700});
  t.deepEqual(layout.text, layout.sheet);
});
