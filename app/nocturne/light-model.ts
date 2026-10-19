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
  /** Moonlight window: centre, size of the lit patch, pane size and edge softness (px). */
  window: {x: number; y: number; width: number; height: number; pane: number; softness: number};
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

/** Soft periodic window bars: 1 inside a pane, 0 on a mullion. */
function panes(t: number, edge: number): number {
  const f = t - Math.floor(t);
  return smoothstep(0, edge, f) * smoothstep(0, edge, 1 - f);
}

/** Fraction of moonlight that passes the window frame at a point of the sheet. */
export function windowGobo(rig: LightRig, x: number, y: number): number {
  const w = rig.window;
  const u = (x - w.x) / w.width;
  const v = (y - w.y) / w.height;
  const edge = Math.max(0.02, w.softness / Math.max(w.width, w.height));
  const aperture = smoothstep(0.5, 0.5 - edge * 2, Math.abs(u)) * smoothstep(0.5, 0.5 - edge * 2, Math.abs(v));
  const mullionEdge = Math.min(0.45, 0.04 + w.softness / w.pane);
  const bars = panes((x - w.x) / w.pane + 0.5, mullionEdge) * panes((y - w.y) / w.pane + 0.5, mullionEdge);
  return aperture * (0.3 + 0.7 * bars);
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
    window: {x: width / 2, y: height / 2, width, height, pane: 120, softness: 8}
  };

  let rig: LightRig;
  let reference: [number, number];

  if (source === 'carriage') {
    // A small lamp on the carriage, just above the paper, shining up the page.
    const lamp: Vec3 = [sheet.headX, sheet.railY, 12 + 0.02 * height];
    const aim: Vec3 = [sheet.headX, sheet.railY - 0.6 * settings.reach * height, 0];
    rig = {...base, position: lamp, direction: normalize([aim[0] - lamp[0], aim[1] - lamp[1], aim[2] - lamp[2]])};
    reference = [sheet.headX, sheet.railY - 0.5 * settings.reach * height];
  } else if (source === 'desk-lamp') {
    // An overhead desk lamp, higher for a longer reach, aimed at the middle of the page.
    const lamp: Vec3 = [position.x * width, position.y * height, (0.3 + 0.4 * settings.reach) * height];
    const aim: Vec3 = [width * 0.5, height * 0.55, 0];
    rig = {...base, position: lamp, direction: normalize([aim[0] - lamp[0], aim[1] - lamp[1], aim[2] - lamp[2]])};
    reference = [aim[0], aim[1]];
  } else {
    // Moonlight: parallel rays at 40° elevation from the moon's side, through a window frame.
    const azimuth = Math.atan2(0.5 - position.y, 0.5 - position.x);
    const elevation = (40 * Math.PI) / 180;
    const direction = normalize([
      Math.cos(azimuth) * Math.cos(elevation),
      Math.sin(azimuth) * Math.cos(elevation),
      -Math.sin(elevation)
    ]);
    const patchWidth = width * 0.62 * settings.reach;
    const patchHeight = height * 0.7 * settings.reach;
    rig = {
      ...base,
      direction,
      window: {
        x: width * (0.5 + (position.x - 0.5) * 0.45),
        y: height * (0.5 + (position.y - 0.5) * 0.45),
        width: patchWidth,
        height: patchHeight,
        pane: Math.max(60, Math.min(patchWidth, patchHeight) / 2),
        softness: 4 + 40 * settings.softness
      }
    };
    reference = [rig.window.x, rig.window.y];
  }

  const referenceIrradiance = irradiance(rig, reference[0], reference[1]);
  return {...rig, exposure: referenceIrradiance > 0 ? settings.intensity / referenceIrradiance : 0};
}
