// Types of the 3D typewriter (typewriter-machine.js is plain JavaScript because three.js ships
// without TypeScript types).

import type {StageLayout} from '../../../app/nocturne/stage-layout';
import type {LightSource} from '../../../app/nocturne/types';

export type MachineQuality = 'high' | 'medium' | 'low';

export type MachineSpec = {
  layout: StageLayout;
  pixelRatio: number;
  quality: MachineQuality;
  /** The active terminal's text grid in stage coordinates: the escapement has one tooth per column. */
  grid: {left: number; cols: number; cellWidth: number};
  theme: {
    room: string;
    light: string;
    source: LightSource;
    trim: string;
    environment: number;
    exposure: number;
  };
  paper: {color: string; appearance: 'light' | 'dark'};
  /** Font stack for the engraved scale numerals and the gilt nameplate. */
  serif: string;
};

export type MachineState = {
  /** Centre of the type head, stage x. */
  headX: number;
  /** Tilt of the head on its rail, radians. */
  sway: number;
  /** Strike travel of the head towards the platen, 0–1.2. */
  strike: number;
  /** Ribbon vibrator lift, about −1–1. */
  vibrator: number;
  /** Ribbon spool rotation, radians. */
  spool: number;
  /** Platen rotation in turns. */
  platenTurn: number;
  /** Carriage lamp on. */
  lamp: boolean;
  intensity: number;
};

export type Machine = {
  build(spec: MachineSpec): void;
  /** Draws the model; false while its shaders are still compiling. */
  render(state: MachineState): boolean;
  dispose(): void;
};
