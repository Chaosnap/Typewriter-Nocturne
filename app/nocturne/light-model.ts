// Physically based light model for the sheet of paper.
//
// The paper is the plane z = 0 in sheet pixels. Lamps are point lights with a soft-edged cone
// (a spot light) at a height above the paper; moonlight is a directional light through a window.
// Irradiance follows the inverse-square law and Lambert's cosine law:
//
//     E = cone(θ) · max(0, n · l) / d²
//
// where d is the distance to the lamp, l the unit vector towards it, n the paper normal (perturbed
// by paper fibres in the shader) and θ the angle from the lamp's axis. The result is exposed so
// that a reference point on the page receives `intensity` and tone-mapped with 1 − e^(−E·k).
//
// lib/nocturne/lighting/paper-light.ts contains the GLSL version of `irradiance`; this TypeScript
// version positions the dust motes in the beam and drives the unit tests.

import {spreadToCosine} from './lighting-math';
import type {LightingSettings, LightSource, NocturneTheme} from './types';

export type Vec3 = [number, number, number];

export type LightRig = {
  source: LightSource;
  /** Lamp position in sheet pixels, z = height above the paper (lamps only). */
  position: Vec3;
  /** Unit vector of the lamp axis, or the direction in which moonlight travels. */
  direction: Vec3;
  cosOuter: number;
  cosInner: number;
  /** Multiplies irradiance before tone mapping. */
  exposure: number;
  /**
   * Moonlight window: centre and size of the lit patch, its square panes across and down, edge
   * softness (px), and the shear of the patch (slanting light casts the window as a parallelogram;
   * 0 is upright).
   */
  window: {
    x: number;
    y: number;
    width: number;
    height: number;
    columns: number;
    rows: number;
    softness: number;
    skew: number;
  };
};

export type SheetGeometry = {
  width: number;
  height: number;
  /** Carriage head (type guide) position on the sheet. */
  headX: number;
  railY: number;
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Half the width of a glazing bar, in pixels, for panes of this size. */
export const barHalfWidth = (paneWidth: number, paneHeight: number) =>
  Math.min(16, Math.max(4, 0.04 * Math.min(paneWidth, paneHeight)));

/** Light passed between two bars along one axis: 0 on a bar, 1 in the pane, blurred by `soft`. */
function between(offset: number, cell: number, bar: number, soft: number): number {
  const t = offset / cell;
  const fromBar = Math.abs(t - Math.round(t)) * cell;
  return smoothstep(bar - soft, bar + soft, fromBar);
}

/** Fraction of moonlight that passes the window frame at a point of the sheet. */
export function windowGobo(rig: LightRig, x: number, y: number): number {
  const w = rig.window;
  const soft = Math.max(0.5, w.softness);
  const sx = x - (y - w.y) * w.skew;
  const dx = sx - w.x;
  const dy = y - w.y;
  const across = smoothstep(-soft, soft, w.width / 2 - Math.abs(dx));
  const down = smoothstep(-soft, soft, w.height / 2 - Math.abs(dy));
  // Bars between the panes; the window's frame is the bar at each edge.
  const paneWidth = w.width / w.columns;
  const paneHeight = w.height / w.rows;
  const bar = barHalfWidth(paneWidth, paneHeight);
  const open = between(dx + w.width / 2, paneWidth, bar, soft) * between(dy + w.height / 2, paneHeight, bar, soft);
  return across * down * (0.3 + 0.7 * open);
}

/** Irradiance (before exposure) at sheet point (x, y) for a paper normal. */
export function irradiance(rig: LightRig, x: number, y: number, normal: Vec3 = [0, 0, 1]): number {
  if (rig.source === 'moonlight') {
    const toLight: Vec3 = [-rig.direction[0], -rig.direction[1], -rig.direction[2]];
    return Math.max(0, dot(normal, toLight)) * windowGobo(rig, x, y);
  }
  const toPoint: Vec3 = [x - rig.position[0], y - rig.position[1], -rig.position[2]];
  const distanceSquared = Math.max(1, dot(toPoint, toPoint));
  const ray = normalize(toPoint);
  const cone = smoothstep(rig.cosOuter, rig.cosInner, dot(ray, rig.direction));
  const lambert = Math.max(0, -dot(normal, ray));
  return (cone * lambert) / distanceSquared;
}

/** Exposure tone mapping to a light amount in [0, 1). */
export const toneMap = (value: number) => 1 - Math.exp(-Math.max(0, value));

/** Light amount in [0, 1) at a sheet point. */
export const lightAmount = (rig: LightRig, x: number, y: number, normal?: Vec3) =>
  toneMap(irradiance(rig, x, y, normal) * rig.exposure);

export function resolveSource(settings: LightingSettings, theme: NocturneTheme): LightSource {
  return settings.source === 'theme' ? theme.light.source : settings.source;
}

/** Builds the light rig for the current settings and sheet geometry. */
export function buildRig(settings: LightingSettings, theme: NocturneTheme, sheet: SheetGeometry): LightRig {
  const source = resolveSource(settings, theme);
  const {width, height} = sheet;
  const halfAngle = Math.acos(spreadToCosine(settings.spread));
  const cosOuter = Math.cos(halfAngle);
  const cosInner = Math.cos(halfAngle * (1 - 0.85 * settings.softness));
  // An explicit source uses the position chosen in Lighting Studio; `theme` uses the theme's lamp.
  const position = settings.source === 'theme' ? theme.light.position : settings.position;
  const base: LightRig = {
    source,
    position: [0, 0, 1],
    direction: [0, 0, -1],
    cosOuter,
    cosInner,
    exposure: 1,
    window: {x: width / 2, y: height / 2, width, height, columns: 3, rows: 2, softness: 8, skew: 0}
  };

  let rig: LightRig;
  /** What reaches the reference point, which the exposure lights to `intensity`. */
  let referenceIrradiance: number;

  // The lamp swivels left or right by `aim` degrees.
  const swivel = (Math.max(-45, Math.min(45, settings.aim)) * Math.PI) / 180;

  if (source === 'carriage') {
    // A small lamp on the carriage, just above the paper, shining up the page.
    const lamp: Vec3 = [sheet.headX, sheet.railY, 12 + 0.02 * height];
    const throwLength = 0.6 * settings.reach * height;
    const aim: Vec3 = [sheet.headX + Math.tan(swivel) * throwLength, sheet.railY - throwLength, 0];
    rig = {...base, position: lamp, direction: normalize([aim[0] - lamp[0], aim[1] - lamp[1], aim[2] - lamp[2]])};
    const referenceLength = 0.5 * settings.reach * height;
    const reference = [sheet.headX + Math.tan(swivel) * referenceLength, sheet.railY - referenceLength];
    referenceIrradiance = irradiance(rig, reference[0], reference[1]);
  } else if (source === 'desk-lamp') {
    // An overhead desk lamp, higher for a longer reach, aimed at the middle of the page.
    const lamp: Vec3 = [position.x * width, position.y * height, (0.3 + 0.4 * settings.reach) * height];
    const dx = width * 0.5 - lamp[0];
    const dy = height * 0.55 - lamp[1];
    const cos = Math.cos(swivel);
    const sin = Math.sin(swivel);
    const aim: Vec3 = [lamp[0] + dx * cos - dy * sin, lamp[1] + dx * sin + dy * cos, 0];
    rig = {...base, position: lamp, direction: normalize([aim[0] - lamp[0], aim[1] - lamp[1], aim[2] - lamp[2]])};
    referenceIrradiance = irradiance(rig, aim[0], aim[1]);
  } else {
    // Moonlight: parallel rays at 40° elevation from the moon's side, through a window frame.
    const azimuth = Math.atan2(0.5 - position.y, 0.5 - position.x) + swivel;
    const elevation = (40 * Math.PI) / 180;
    const direction = normalize([
      Math.cos(azimuth) * Math.cos(elevation),
      Math.sin(azimuth) * Math.cos(elevation),
      -Math.sin(elevation)
    ]);
    const frame = settings.window;
    // Square panes, each half the shorter side of a window that would cover most of the sheet;
    // Reach makes them larger or smaller.
    const pane = Math.max(60, (Math.min(width * 0.62, height * 0.7) * settings.reach) / 2);
    rig = {
      ...base,
      direction,
      window: {
        x: width * frame.x,
        y: height * frame.y,
        width: pane * frame.columns,
        height: pane * frame.rows,
        columns: frame.columns,
        rows: frame.rows,
        // Light scattered on the way blurs the window's edges and bars.
        softness: 4 + 40 * settings.softness,
        // Upright by default; a slant leans the window as light from low and to the side does.
        skew: Math.tan((Math.max(-35, Math.min(35, frame.slant)) * Math.PI) / 180)
      }
    };
    // Measured where the moonlight passes the window unobstructed, in the middle of a pane.
    referenceIrradiance = Math.max(0, -direction[2]);
  }

  return {...rig, exposure: referenceIrradiance > 0 ? settings.intensity / referenceIrradiance : 0};
}
