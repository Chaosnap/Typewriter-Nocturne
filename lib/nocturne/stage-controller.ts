// Drives the Nocturne stage: the light on the paper, the glow, the type impressions, the 3D
// typewriter with its physics, and the typewriter sounds.
//
// Everything here reacts to what the terminal has already rendered (cursor geometry, echoed
// characters, published by terminal-bridge.ts) or to passive key observation (keys.ts). Nothing
// reaches the PTY and nothing delays input. Frames are drawn only while something moves or an
// ambient effect (film grain, dust) is switched on, and never while the window is hidden.

import {activePaper, activeTheme} from '../../app/nocturne/apply-config';
import {CARRIAGE_RETURN, ESCAPEMENT, stepImpact, stepSpring, stepSway} from '../../app/nocturne/carriage-physics';
import type {Body} from '../../app/nocturne/carriage-physics';
import {toUnit} from '../../app/nocturne/color';
import {buildRig} from '../../app/nocturne/light-model';
import type {LightRig} from '../../app/nocturne/light-model';
import {ambientFloor} from '../../app/nocturne/lighting-math';
import type {Paper} from '../../app/nocturne/papers';
import {fontStack, UI_SERIF} from '../../app/nocturne/settings';
import type {StageLayout} from '../../app/nocturne/stage-layout';
import type {NocturneSettings, NocturneTheme} from '../../app/nocturne/types';

import {on} from './bus';
import type {CursorFrame, KeyKind, StrikeEvent} from './bus';
import {GlowLayer} from './lighting/glow-layer';
import {PaperLight} from './lighting/paper-light';
import type {Machine, MachineSpec} from './machine/types';
import {createMachine} from './machine/typewriter-machine';
import {lightColorOf} from './theme-css';
import {InkLayer} from './typewriter/ink-layer';
import type {InkStyle, InkViewport} from './typewriter/ink-layer';
import {TypewriterSounds} from './typewriter/sound-engine';

export type StageElements = {
  stage: HTMLElement;
  paper: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  ink: HTMLCanvasElement;
  machine: HTMLCanvasElement;
};

type Grid = {left: number; top: number; cols: number; cellWidth: number; cellHeight: number};

const rest = (): Body => ({position: 0, velocity: 0});
const moving = (body: Body, target = 0) => body.position !== target || body.velocity !== 0;

// Springs of the head, in pixels (strike travel, ribbon lift) and degrees (platen).
const STRIKE = {frequency: 9, damping: 0.5};
const VIBRATOR = {frequency: 10, damping: 0.6};
const PLATEN = {frequency: 6, damping: 0.9};
const STRIKE_TRAVEL = 3.5;
const VIBRATOR_LIFT = 7;
/** Platen rotation per line feed, degrees. */
const LINE_FEED_DEGREES = 10;
/** Ambient effects (grain, dust) are animated at about 30 frames per second. */
const AMBIENT_INTERVAL = 33;
const REBUILD_DELAY = 140;

export class StageController {
  private settings: NocturneSettings;
  private layout: StageLayout | null = null;
  private paperLight: PaperLight | null;
  private glow: GlowLayer;
  private ink: InkLayer;
  private machine: Machine | null = null;
  private machineFailed = false;
  private sounds = new TypewriterSounds();
  private disposers: (() => void)[] = [];
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  private frameRequest = 0;
  private lastTime = 0;
  private lastAmbient = 0;
  private dirty = true;
  private cursorMoved = false;
  private origin = {left: 0, top: 0};
  private cursor: CursorFrame | null = null;
  private grid: Grid | null = null;

  private carriage = rest();
  private targetX = 0;
  private returning = false;
  private sway = rest();
  private strike = rest();
  private vibrator = rest();
  private platen = rest();
  private platenTarget = 0;
  private spool = 0;

  private surfaceKey = '';
  private machineKey = '';
  private rebuildTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private elements: StageElements,
    settings: NocturneSettings
  ) {
    this.settings = settings;
    this.paperLight = PaperLight.create(elements.paper);
    this.glow = new GlowLayer(elements.glow);
    this.ink = new InkLayer(elements.ink);
    this.sounds.configure(settings.typewriter);

    this.disposers.push(
      on('cursor', (frame) => this.onCursor(frame)),
      on('strike', (strike) => this.onStrike(strike)),
      on('key', ({kind, repeat}) => this.onKey(kind, repeat)),
      on('marginBell', () => this.onMarginBell())
    );
    const wake = () => this.invalidate();
    document.addEventListener('visibilitychange', wake);
    this.reduceMotion.addEventListener('change', wake);
    this.disposers.push(() => {
      document.removeEventListener('visibilitychange', wake);
      this.reduceMotion.removeEventListener('change', wake);
    });
  }

  /** Whether the paper light could start (WebGL 2); without it the sheet keeps its plain colour. */
  get hasPaperLight() {
    return this.paperLight !== null;
  }

  update(settings: NocturneSettings, layout: StageLayout) {
    const previous = this.settings;
    this.settings = settings;
    this.layout = layout;
    if (previous.typewriter !== settings.typewriter) {
      this.sounds.configure(settings.typewriter);
    }
    this.measureOrigin();
    this.refreshGrid();
    this.rebuild(false);
    this.invalidate();
  }

  // ------------------------------------------------------------------------------------------
  // Events

  private onCursor(frame: CursorFrame) {
    const first = this.cursor === null;
    const previousGrid = JSON.stringify(this.grid);
    this.cursor = frame;
    this.measureOrigin();
    this.refreshGrid();
    if (JSON.stringify(this.grid) !== previousGrid) {
      this.rebuild(false);
    }
    const target = frame.x - this.origin.left + frame.width / 2;
    if (first || !this.animated()) {
      if (target !== this.carriage.position) {
        this.carriage = {position: target, velocity: 0};
        this.dirty = true;
      }
    } else if (target < this.carriage.position - 4 * Math.max(1, frame.width)) {
      this.returning = true;
    }
    this.targetX = target;
    // Moving the cursor only moves its glow; the physics step notices a new target by itself.
    this.cursorMoved = true;
    this.schedule();
  }

  private onStrike(strike: StrikeEvent) {
    if (!this.animated() || this.settings.typewriter.impression <= 0 || strike.uid !== this.cursor?.uid) {
      return;
    }
    this.ink.add(strike, performance.now());
    this.schedule();
  }

  private onKey(kind: KeyKind, repeat: boolean) {
    if (!this.theme()) {
      return;
    }
    const {typewriter} = this.settings;
    if (kind === 'return') {
      if (typewriter.returnSound) {
        this.sounds.play('return', repeat);
      }
      this.platenTarget += LINE_FEED_DEGREES;
    } else if (kind === 'backspace') {
      this.sounds.play('backspace', repeat);
    } else {
      this.sounds.play(kind === 'space' ? 'space' : 'key', repeat);
      // The type bar throws the head at the platen; the ribbon lifts; the spools advance.
      this.strike = {position: this.strike.position, velocity: 30 * STRIKE_TRAVEL};
      this.vibrator = {position: this.vibrator.position, velocity: 16 * VIBRATOR_LIFT};
      this.spool += 0.07;
    }
    if (!this.animated()) {
      this.platen = {position: this.platenTarget, velocity: 0};
      this.strike = rest();
      this.vibrator = rest();
    }
    this.invalidate();
  }

  private onMarginBell() {
    if (this.theme() && this.settings.typewriter.marginBell) {
      this.sounds.play('bell');
    }
  }

  // ------------------------------------------------------------------------------------------
  // State

  private animated() {
    const {settings} = this;
    return settings.effects && !settings.focusMode && !this.reduceMotion.matches;
  }

  private lampOn() {
    const {settings} = this;
    return settings.effects && !settings.focusMode && settings.lighting.enabled;
  }

  private measureOrigin() {
    const rect = this.elements.stage.getBoundingClientRect();
    this.origin = {left: rect.left, top: rect.top};
  }

  private refreshGrid() {
    const frame = this.cursor;
    if (!frame) {
      return;
    }
    this.grid = {
      left: frame.grid.left - this.origin.left,
      top: frame.grid.top - this.origin.top,
      cols: frame.cols,
      cellWidth: frame.grid.width / frame.cols,
      cellHeight: frame.grid.height / frame.rows
    };
  }

  private theme(): NocturneTheme | null {
    return activeTheme(this.settings);
  }

  private pixelRatio() {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  // ------------------------------------------------------------------------------------------
  // Building

  /** Rebuilds the paper surface and the model when their inputs changed (debounced on resize). */
  private rebuild(force: boolean) {
    const {layout} = this;
    const theme = this.theme();
    if (!layout || !theme) {
      return;
    }
    const paper = activePaper(this.settings);
    const ratio = this.pixelRatio();
    const {sheet} = layout;
    const surfaceKey = JSON.stringify([sheet.width, sheet.height, ratio, paper.id, this.settings.paper.texture]);
    const spec = this.machineSpec(theme, paper);
    const machineKey = spec ? JSON.stringify([spec, theme.id]) : '';
    if (surfaceKey === this.surfaceKey && machineKey === this.machineKey) {
      return;
    }
    const firstBuild = this.surfaceKey === '' || (machineKey !== '' && this.machineKey === '');
    if (!force && !firstBuild) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = setTimeout(() => this.rebuild(true), REBUILD_DELAY);
      return;
    }
    if (surfaceKey !== this.surfaceKey) {
      this.surfaceKey = surfaceKey;
      this.glow.resize(sheet.width, sheet.height, ratio);
      this.ink.resize(sheet.width, sheet.height, ratio);
      this.paperLight?.build({
        width: sheet.width,
        height: sheet.height,
        pixelRatio: ratio,
        paper,
        texture: this.settings.paper.texture
      });
    }
    if (machineKey !== this.machineKey) {
      this.machineKey = machineKey;
      if (spec) {
        this.ensureMachine()?.build(spec);
      }
    }
    this.dirty = true;
    this.schedule();
  }

  private ensureMachine() {
    if (!this.machine && !this.machineFailed) {
      this.machine = createMachine(this.elements.machine);
      this.machineFailed = this.machine === null;
    }
    return this.machine;
  }

  private machineSpec(theme: NocturneTheme, paper: Paper): MachineSpec | null {
    const {layout, grid, settings} = this;
    if (!layout?.machine || !grid) {
      return null;
    }
    const quality = settings.lighting.quality === 'auto' ? 'high' : settings.lighting.quality;
    return {
      layout,
      pixelRatio: this.pixelRatio(),
      quality,
      grid: {left: Math.round(grid.left), cols: grid.cols, cellWidth: Math.round(grid.cellWidth * 100) / 100},
      theme: {
        room: theme.palette.room,
        light: lightColorOf(theme, settings),
        source: settings.lighting.source === 'theme' ? theme.light.source : settings.lighting.source,
        trim: theme.scene.trim,
        environment: theme.scene.environment,
        exposure: theme.scene.exposure
      },
      paper: {color: paper.paper, appearance: paper.appearance},
      serif: UI_SERIF
    };
  }

  // ------------------------------------------------------------------------------------------
  // Frames

  /** Marks everything for redrawing on the next frame. */
  invalidate() {
    this.dirty = true;
    this.schedule();
  }

  private schedule() {
    if (!this.frameRequest && !document.hidden) {
      this.frameRequest = requestAnimationFrame((now) => this.frame(now));
    }
  }

  /** Advances the physics; returns whether anything is still moving. */
  private step(dt: number) {
    if (!this.animated()) {
      this.carriage = {position: this.targetX, velocity: 0};
      this.sway = rest();
      this.platen = {position: this.platenTarget, velocity: 0};
      return false;
    }
    const before = this.carriage.velocity;
    const params = this.returning ? CARRIAGE_RETURN : ESCAPEMENT;
    this.carriage = stepImpact(this.carriage, this.targetX, params, dt);
    const acceleration = dt > 0 ? (this.carriage.velocity - before) / dt : 0;
    this.sway = stepSway(this.sway, acceleration, dt);
    if (!moving(this.carriage, this.targetX)) {
      this.returning = false;
    }
    // The head is thrown forward, stopped by the platen, and springs back.
    const strike = stepSpring(this.strike, 0, STRIKE, dt);
    this.strike = strike.position < 0 ? rest() : strike;
    this.vibrator = stepSpring(this.vibrator, 0, VIBRATOR, dt);
    this.platen = stepSpring(this.platen, this.platenTarget, PLATEN, dt);
    return (
      moving(this.carriage, this.targetX) ||
      moving(this.sway) ||
      moving(this.strike) ||
      moving(this.vibrator) ||
      moving(this.platen, this.platenTarget)
    );
  }

  private ambient() {
    const {lighting} = this.settings;
    return this.lampOn() && this.animated() && (lighting.grain > 0 || lighting.particles > 0);
  }

  private frame(now: number) {
    this.frameRequest = 0;
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = now;
    const {layout} = this;
    const theme = this.theme();
    if (!layout || !theme) {
      return;
    }
    const stillMoving = this.step(dt);
    const ambient = this.ambient();
    const ambientDue = ambient && now - this.lastAmbient >= AMBIENT_INTERVAL;
    const effects = this.settings.effects && !this.settings.focusMode;
    const paper = activePaper(this.settings);

    if (effects && (this.dirty || stillMoving || ambientDue || this.cursorMoved)) {
      const rig = this.rig(theme, layout);
      if (this.dirty || stillMoving || ambientDue) {
        this.lastAmbient = now;
        this.paperLight?.render(this.lightFrame(rig, theme, paper, now));
      }
      this.glow.render(this.glowFrame(rig, theme, paper, layout, now));
    } else if (!effects && this.dirty) {
      this.glow.clear();
    }
    if (layout.machine && (this.dirty || stillMoving)) {
      this.machine?.render({
        headX: this.carriage.position,
        sway: this.sway.position,
        strike: this.strike.position / STRIKE_TRAVEL,
        vibrator: this.vibrator.position / VIBRATOR_LIFT,
        spool: this.spool,
        platenTurn: this.platen.position / 360,
        lamp: this.lampOn(),
        intensity: this.settings.lighting.intensity
      });
    }
    const inking = this.ink.render(now, this.inkStyle(paper, effects), this.inkViewport(layout));
    this.dirty = false;
    this.cursorMoved = false;
    if (stillMoving || ambient || inking) {
      this.schedule();
    } else {
      this.lastTime = 0;
    }
  }

  private rig(theme: NocturneTheme, layout: StageLayout): LightRig {
    const {sheet} = layout;
    return buildRig(this.settings.lighting, theme, {
      width: sheet.width,
      height: sheet.height,
      headX: this.carriage.position - sheet.x,
      railY: layout.bailY - sheet.y + 12
    });
  }

  private lightFrame(rig: LightRig, theme: NocturneTheme, paper: Paper, now: number) {
    const {lighting} = this.settings;
    // The room dims the page away from the lamp, but never below the contrast-safe floor.
    const floor = Math.max(ambientFloor(paper.ink, paper.paper, 4.5), paper.appearance === 'light' ? 0.55 : 0.62);
    const ambient = Math.min(1, Math.max(floor, 1 - theme.light.shade * (0.55 + 0.45 * lighting.intensity)));
    const room = toUnit(theme.palette.room);
    const tint = (c: number) => 1 + (0.6 + c * 1.5 - 1) * 0.4;
    return {
      rig,
      lamp: this.lampOn(),
      tint: toUnit(lightColorOf(theme, this.settings)),
      ambient,
      ambientTint: [tint(room[0]), tint(room[1]), tint(room[2])] as [number, number, number],
      relief: 2 * lighting.paperIllumination,
      grain: this.animated() ? lighting.grain : 0,
      time: now / 1000
    };
  }

  private glowFrame(rig: LightRig, theme: NocturneTheme, paper: Paper, layout: StageLayout, now: number) {
    const {lighting} = this.settings;
    const [r, g, b] = toUnit(lightColorOf(theme, this.settings)).map((c) => Math.round(c * 255));
    const frame = this.cursor;
    let cursor: {x: number; y: number} | null = null;
    if (frame?.visible) {
      cursor = {
        x: frame.x - this.origin.left - layout.sheet.x + frame.width / 2,
        y: frame.y - this.origin.top - layout.sheet.y + frame.height / 2
      };
    }
    return {
      rig,
      lamp: this.lampOn(),
      rgb: `${r}, ${g}, ${b}`,
      appearance: paper.appearance,
      intensity: lighting.intensity,
      particles: this.animated() ? lighting.particles : 0,
      cursorGlow: lighting.cursorGlow,
      cursor,
      time: now / 1000
    };
  }

  private inkStyle(paper: Paper, effects: boolean): InkStyle {
    const {typography, typewriter} = this.settings;
    return {
      fontFamily: fontStack(typography),
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      fontWeightBold: typography.fontWeightBold,
      letterSpacing: typography.letterSpacing,
      ink: paper.ink,
      ansi: paper.ansi,
      impression: effects ? typewriter.impression : 0
    };
  }

  private inkViewport(layout: StageLayout): InkViewport | null {
    const {grid, cursor} = this;
    if (!grid || !cursor) {
      return null;
    }
    return {
      left: grid.left - layout.sheet.x,
      top: grid.top - layout.sheet.y,
      cellHeight: grid.cellHeight,
      viewportY: cursor.viewportY
    };
  }

  dispose() {
    clearTimeout(this.rebuildTimer);
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.disposers.forEach((dispose) => dispose());
    this.machine?.dispose();
    this.paperLight?.dispose();
    this.sounds.close();
  }
}
