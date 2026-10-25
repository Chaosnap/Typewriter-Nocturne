import test from 'ava';

import {
  aimCarriage,
  CARRIAGE_RETURN,
  createCarriage,
  ESCAPEMENT,
  isSettled,
  stepCarriage,
  stepImpact,
  stepSpring,
  stepSway
} from '../../app/nocturne/carriage-physics';
import type {Body} from '../../app/nocturne/carriage-physics';
import {buildRig, irradiance, lightAmount} from '../../app/nocturne/light-model';
import type {LightRig} from '../../app/nocturne/light-model';
import {defaultSettings} from '../../app/nocturne/settings';
import {THEMES} from '../../app/nocturne/themes';

const FRAME = 1 / 60;

const simulate = (step: (body: Body) => Body, start: Body, frames = 240) => {
  let body = start;
  let min = body.position;
  let max = body.position;
  let settledAt = -1;
  for (let i = 1; i <= frames; i++) {
    body = step(body);
    min = Math.min(min, body.position);
    max = Math.max(max, body.position);
    if (settledAt < 0 && body.velocity === 0) {
      settledAt = i;
    }
  }
  return {body, min, max, settledAt};
};

test('one escapement step lands on the next cell within a few frames', (t) => {
  const result = simulate((body) => stepImpact(body, 9, ESCAPEMENT, FRAME), {position: 0, velocity: 0});
  t.is(result.body.position, 9);
  t.true(result.settledAt > 0 && result.settledAt <= 4, `settled after ${result.settledAt} frames`);
  t.true(result.max <= 9, 'the escapement stop is never passed');
});

test('a carriage return hits the margin stop and rebounds without passing it', (t) => {
  const result = simulate((body) => stepImpact(body, 0, CARRIAGE_RETURN, FRAME), {position: 600, velocity: 0});
  t.is(result.body.position, 0);
  t.true(result.min >= 0, 'never travels past the margin stop');
  t.true(result.settledAt > 10, 'a return is a visible slide, not a jump');
});

test('the impact model is stable for any frame time', (t) => {
  for (const dt of [0, 0.001, 1 / 240, 1 / 30, 0.25, 5]) {
    const body = stepImpact({position: 0, velocity: 0}, 100, ESCAPEMENT, dt);
    t.true(Number.isFinite(body.position) && Number.isFinite(body.velocity), `dt=${dt}`);
  }
});

test('the platen spring settles on the next line without overshoot', (t) => {
  const result = simulate((body) => stepSpring(body, 20, {frequency: 13, damping: 1}, FRAME), {
    position: 0,
    velocity: 0
  });
  t.is(result.body.position, 20);
  t.true(result.max <= 20.01);
});

test('large leftward jumps are carriage returns; the carriage settles', (t) => {
  let carriage = aimCarriage(createCarriage(400, 100), 30, 118, 9);
  t.is(carriage.mode, 'return');
  for (let i = 0; i < 120; i++) {
    carriage = stepCarriage(carriage, FRAME);
  }
  t.true(isSettled(carriage));
  t.is(carriage.mode, 'escapement');
  t.is(aimCarriage(carriage, 39, 118, 9).mode, 'escapement');
});

const sheet = {width: 900, height: 600, headX: 450, railY: 520};
const lampRig = (): LightRig => {
  const settings = defaultSettings().lighting;
  return buildRig({...settings, source: 'desk-lamp', position: {x: 0.5, y: 0.5}}, THEMES['midnight-study'], sheet);
};

test('lamp irradiance follows the inverse-square law', (t) => {
  const rig: LightRig = {...lampRig(), position: [0, 0, 100], direction: [0, 0, -1], cosOuter: -1, cosInner: -0.9};
  const near = irradiance(rig, 0, 0);
  // Same incidence angle, twice the distance: move the lamp up instead of across.
  const far = irradiance({...rig, position: [0, 0, 200]}, 0, 0);
  t.true(Math.abs(near / far - 4) < 1e-9);
});

test('lamp irradiance follows Lambert’s cosine law', (t) => {
  const rig: LightRig = {...lampRig(), position: [0, 0, 100], direction: [0, 0, -1], cosOuter: -1, cosInner: -0.9};
  const flat = irradiance(rig, 0, 0, [0, 0, 1]);
  const tilted = irradiance(rig, 0, 0, [Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3)]);
  t.true(Math.abs(tilted / flat - 0.5) < 1e-9);
});

test('nothing outside the cone is lit', (t) => {
  const rig: LightRig = {...lampRig(), position: [0, 0, 100], direction: [0, 0, -1], cosOuter: 0.95, cosInner: 0.99};
  t.is(irradiance(rig, 1000, 0), 0);
  t.true(irradiance(rig, 0, 0) > 0);
});

test('exposure maps the reference point to the chosen intensity', (t) => {
  const settings = {...defaultSettings().lighting, intensity: 1.2};
  const rig = buildRig({...settings, source: 'desk-lamp'}, THEMES['midnight-study'], sheet);
  t.true(Math.abs(lightAmount(rig, 450, 330) - (1 - Math.exp(-1.2))) < 1e-6);
});

test('the carriage lamp lights the text above the carriage, not below it', (t) => {
  const settings = {...defaultSettings().lighting, source: 'carriage' as const};
  const rig = buildRig(settings, THEMES['paper-and-ink'], sheet);
  t.true(lightAmount(rig, 450, 300) > 0.2);
  t.is(lightAmount(rig, 450, 590), 0);
});

test('moonlight is shaped by the window frame', (t) => {
  const settings = {...defaultSettings().lighting, source: 'moonlight' as const, softness: 0};
  const rig = buildRig(settings, THEMES['moonlit-poetry'], sheet);
  const inPane = lightAmount(rig, rig.window.x, rig.window.y);
  const onMullion = lightAmount(rig, rig.window.x + rig.window.pane / 2, rig.window.y);
  t.true(inPane > onMullion);
  t.is(lightAmount(rig, -2000, -2000), 0);
});

test('the head sways against a sudden stop and comes to rest', (t) => {
  // A carriage return hitting the margin stop: a large deceleration for one frame.
  let body = stepSway({position: 0, velocity: 0}, 150000, FRAME);
  let peak = 0;
  for (let i = 0; i < 600 && (body.position !== 0 || body.velocity !== 0); i++) {
    body = stepSway(body, 0, FRAME);
    peak = Math.max(peak, Math.abs(body.position));
  }
  t.true(peak > 0.005, `visible sway (${peak.toFixed(4)} rad)`);
  t.true(peak <= 0.09, 'tilt is bounded');
  t.deepEqual(body, {position: 0, velocity: 0});
});

test('the head tips away from the direction of acceleration', (t) => {
  t.true(stepSway({position: 0, velocity: 0}, 60000, FRAME).position < 0);
  t.true(stepSway({position: 0, velocity: 0}, -60000, FRAME).position > 0);
});

test('aiming the carriage lamp swivels its beam', (t) => {
  const settings = defaultSettings().lighting;
  const straight = buildRig({...settings, source: 'carriage', aim: 0}, THEMES['paper-and-ink'], sheet);
  const right = buildRig({...settings, source: 'carriage', aim: 30}, THEMES['paper-and-ink'], sheet);
  const left = buildRig({...settings, source: 'carriage', aim: -30}, THEMES['paper-and-ink'], sheet);
  t.is(straight.direction[0], 0);
  t.true(right.direction[0] > 0);
  t.true(left.direction[0] < 0);
  t.true(irradiance(right, 650, 300) * right.exposure > irradiance(straight, 650, 300) * straight.exposure);
});
