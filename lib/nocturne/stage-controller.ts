// Drives the Nocturne stage: the light on the paper, the glow, the type impressions, the 3D
// typewriter with its physics, and the typewriter sounds.
//
// Everything here reacts to what the terminal has already rendered (cursor geometry, echoed
// characters, published by terminal-bridge.ts) or to passive key observation (keys.ts). Nothing
// reaches the PTY and nothing delays input. A layer is redrawn only when something visible about it
// changed; frames run only while something moves or an ambient effect is on, never while the
// window is hidden. In `basic` mode (no usable GPU, see lighting/gpu.ts) no WebGL is used at all.

import {activePaper, activeTheme, inkSelectionOn, lightOn, paperEffectsOn} from '../../app/nocturne/apply-config';
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
import type {CueKind, CursorFrame, KeyKind, SelectedCell, StrikeEvent} from './bus';
import {GlowLayer} from './lighting/glow-layer';
import type {RenderMode} from './lighting/gpu';
import {PaperLight} from './lighting/paper-light';
import type {Machine, MachineQuality, MachineSpec, MachineState} from './machine/types';
import {createMachine} from './machine/typewriter-machine';
import {lightColorOf} from './theme-css';
import {InkLayer} from './typewriter/ink-layer';
import type {InkStyle, InkViewport} from './typewriter/ink-layer';
import {SelectionLayer} from './typewriter/selection-layer';
import type {SelectionLook} from './typewriter/selection-layer';
import {TypewriterSounds} from './typewriter/sound-engine';
import type {SoundKind} from './typewriter/sound-engine';

export type StageElements = {
  stage: HTMLElement;
  paper: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  ink: HTMLCanvasElement;
  selection: HTMLCanvasElement;
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
/** Ambient effects (dust, strong film grain) are animated at about 30 frames per second. */
const AMBIENT_INTERVAL = 33;
/** Film grain below this strength stays still; stronger grain flickers like film. */
const MOVING_GRAIN = 0.2;
const REBUILD_DELAY = 140;
/** In constrained mode the model and the light are redrawn at most ten times a second. */
const CONSTRAINED_INTERVAL = 100;
/** Frames slower than this, many in a row while animating, switch to constrained mode. */
const SLOW_FRAME_MS = 70;
const SLOW_FRAMES_LIMIT = 20;

/** A key that changes only when the model would look different (a quarter pixel, a tenth of a degree). */
function machineLook(state: MachineState) {
  return [
    Math.round(state.headX * 4),
    Math.round(state.sway * 2000),
    Math.round(state.strike * 40),
    Math.round(state.vibrator * 40),
    Math.round(state.platenTurn * 3600),
    Math.round(state.spool * 100),
    state.lamp,
    state.intensity
  ].join();
}

export class StageController {
  private settings: NocturneSettings;
  private layout: StageLayout | null = null;
  private mode: RenderMode = 'basic';
  private paperLight: PaperLight | null = null;
  private paperLightFailed = false;
  private glow: GlowLayer;
  private ink: InkLayer;
  private selection: SelectionLayer;
  private machine: Machine | null = null;
  private machineFailed = false;
  private sounds = new TypewriterSounds();
  private disposers: (() => void)[] = [];
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * Frames were too slow while animating: the stage is drawn simply (no shadows, 1× resolution)
   * and without continuous motion, so it never competes with the terminal for frames.
   */
  private constrained = false;
  private slowFrames = 0;

  private frameRequest = 0;
  private lastTime = 0;
  private lastAmbient = 0;
  private lastHeavy = 0;
  private dirty = true;
  private cursorMoved = false;
  private drawnMachine = '';
  private drawnLight = '';
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
    this.glow = new GlowLayer(elements.glow);
    this.ink = new InkLayer(elements.ink);
    this.selection = new SelectionLayer(elements.selection);
    this.sounds.configure(settings.typewriter);

    this.disposers.push(
      on('cursor', (frame) => this.onCursor(frame)),
      on('strike', (strike) => this.onStrike(strike)),
      on('key', ({kind, repeat}) => this.onKey(kind, repeat)),
      on('marginBell', () => this.onMarginBell()),
      on('cue', ({kind}) => this.onCue(kind)),
      on('selection', ({uid, cells}) => this.onSelection(uid, cells))
    );
    const wake = () => this.invalidate();
    document.addEventListener('visibilitychange', wake);
    this.reduceMotion.addEventListener('change', wake);
    this.disposers.push(() => {
      document.removeEventListener('visibilitychange', wake);
      this.reduceMotion.removeEventListener('change', wake);
    });
  }

  update(settings: NocturneSettings, layout: StageLayout, mode: RenderMode) {
    const previous = this.settings;
    this.settings = settings;
    this.layout = layout;
    this.mode = mode;
    if (previous.typewriter !== settings.typewriter) {
      this.sounds.configure(settings.typewriter);
    }
    this.elements.stage.dataset.render = this.renderLabel();
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
    if (first || !this.moves()) {
      this.carriage = {position: target, velocity: 0};
    } else if (target < this.carriage.position - 4 * Math.max(1, frame.width)) {
      this.returning = true;
    }
    this.targetX = target;
    this.cursorMoved = true;
    this.schedule();
  }

  private onStrike(strike: StrikeEvent) {
    const off = !paperEffectsOn(this.settings) || this.reduceMotion.matches || this.settings.typewriter.impression <= 0;
    if (off || strike.uid !== this.cursor?.uid) {
      return;
    }
    this.ink.add(strike, performance.now());
    this.schedule();
  }

  /** Stereo position of the type head, −0.7 (left) to 0.7 (right). */
  private pan() {
    const width = this.layout?.width ?? 0;
    return width > 0 ? Math.max(-0.7, Math.min(0.7, (this.carriage.position / width) * 1.4 - 0.7)) : 0;
  }

  private play(kind: SoundKind, repeat = false, gain = 1) {
    this.sounds.play(kind, {repeat, pan: this.pan(), gain});
  }

  /** The type bar throws the head at the platen; the ribbon lifts; the spools advance. */
  private throwTypeBar(force: number) {
    this.strike = {position: this.strike.position, velocity: 30 * STRIKE_TRAVEL * force};
    this.vibrator = {position: this.vibrator.position, velocity: 16 * VIBRATOR_LIFT * force};
    this.spool += 0.07 * force;
  }

  private onKey(kind: KeyKind, repeat: boolean) {
    if (!this.theme()) {
      return;
    }
    const stage = this.elements.stage;
    stage.dataset.keys = String(Number(stage.dataset.keys ?? 0) + 1);
    const {typewriter} = this.settings;
    switch (kind) {
      case 'return':
        if (typewriter.returnSound) {
          this.play('return', repeat);
        }
        this.platenTarget += LINE_FEED_DEGREES;
        break;
      case 'backspace':
        this.play('backspace', repeat);
        break;
      case 'up':
      case 'down':
        // Recalling shell history turns the platen back or forward by one notch.
        this.play('history', repeat);
        this.platenTarget += kind === 'up' ? -LINE_FEED_DEGREES / 2 : LINE_FEED_DEGREES / 2;
        break;
      case 'left':
      case 'right':
        this.play('nudge', repeat);
        break;
      case 'tab':
        this.play('tab', repeat);
        break;
      case 'select':
        this.play('select', repeat);
        this.vibrator = {position: this.vibrator.position, velocity: 6 * VIBRATOR_LIFT};
        break;
      case 'commit':
        this.play('commit');
        this.throwTypeBar(1.35);
        break;
      case 'compose':
        // A keystroke inside an input method: the key is struck while the text is still preedit.
        this.play('key', repeat, 0.85);
        this.throwTypeBar(0.8);
        break;
      default:
        this.play(kind === 'space' ? 'space' : 'key', repeat);
        this.throwTypeBar(1);
    }
    if (!this.moves()) {
      this.platen = {position: this.platenTarget, velocity: 0};
      this.strike = rest();
      this.vibrator = rest();
    }
    this.schedule();
  }

  private onSelection(uid: string, cells: SelectedCell[]) {
    if (this.cursor && uid !== this.cursor.uid) {
      return;
    }
    const animate = inkSelectionOn(this.settings) && !this.reduceMotion.matches;
    this.selection.set(cells, performance.now(), animate);
    this.schedule();
  }

  /** Double-clicking a bail roller rolls the paper to its top or bottom: the platen turns a full turn. */
  roll(direction: 'top' | 'bottom') {
    this.platenTarget += direction === 'top' ? -360 : 360;
    if (!this.moves()) {
      this.platen = {position: this.platenTarget, velocity: 0};
    }
    this.play('print', false, 0.7);
    this.schedule();
  }

  private onMarginBell() {
    if (this.theme() && this.settings.typewriter.marginBell) {
      this.play('bell');
    }
  }

  private onCue(kind: CueKind) {
    if (!this.theme()) {
      return;
    }
    if (kind === 'line') {
      this.play('line', false, 0.8);
      this.throwTypeBar(0.6);
      this.schedule();
      return;
    }
    // The lamp cord hangs at the left of the room.
    this.sounds.play(kind, {pan: kind === 'cord' ? -0.8 : 0});
  }

  // ------------------------------------------------------------------------------------------
  // State

  /** The paper light canvas is drawn: for the paper's texture, for the lamp, or both. */
  private effects() {
    return paperEffectsOn(this.settings) || lightOn(this.settings);
  }

  /** Depth of the paper's relief; flat when only the light is kept in Focus Mode. */
  private texture() {
    return paperEffectsOn(this.settings) ? this.settings.paper.texture : 0;
  }

  /** WebGL layers (paper light, typewriter) are in use. */
  private full() {
    return this.mode !== 'basic';
  }

  /** Physics and ambient animation run. */
  private moves() {
    const {settings} = this;
    return settings.effects && !settings.focusMode && this.full() && !this.reduceMotion.matches && !this.constrained;
  }

  private lampOn() {
    return lightOn(this.settings);
  }

  private renderLabel() {
    if (!this.full()) {
      return 'basic';
    }
    return this.constrained ? 'constrained' : this.mode;
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

  private quality(): MachineQuality {
    if (this.constrained || this.mode === 'basic') {
      return 'low';
    }
    return this.mode;
  }

  private pixelRatio() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const quality = this.quality();
    if (quality === 'low') {
      return 1;
    }
    return quality === 'medium' ? Math.min(1.5, ratio) : ratio;
  }

  private constrain(reason: string) {
    if (this.constrained) {
      return;
    }
    console.info(`Typewriter Nocturne: ${reason}; drawing the stage simply.`);
    this.constrained = true;
    this.surfaceKey = '';
    this.machineKey = '';
    this.elements.stage.dataset.render = this.renderLabel();
    this.rebuild(true);
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
    const surfaceKey = JSON.stringify([sheet.width, sheet.height, ratio, paper.id, paper.paper, this.texture()]);
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
      this.selection.resize(sheet.width, sheet.height, ratio);
      if (this.full()) {
        this.ensurePaperLight()?.build({
          width: sheet.width,
          height: sheet.height,
          pixelRatio: ratio,
          paper,
          texture: this.texture()
        });
      }
    }
    if (machineKey !== this.machineKey) {
      this.machineKey = machineKey;
      if (spec) {
        this.ensureMachine()?.build(spec);
        this.elements.stage.dataset.machine = 'built';
      }
    }
    this.dirty = true;
    this.schedule();
  }

  private ensurePaperLight() {
    if (!this.paperLight && !this.paperLightFailed) {
      this.paperLight = PaperLight.create(this.elements.paper, () => this.invalidate());
      this.paperLightFailed = this.paperLight === null;
    }
    return this.paperLight;
  }

  private ensureMachine() {
    if (!this.machine && !this.machineFailed) {
      this.machine = createMachine(this.elements.machine, () => this.invalidate());
      this.machineFailed = this.machine === null;
    }
    return this.machine;
  }

  private machineSpec(theme: NocturneTheme, paper: Paper): MachineSpec | null {
    const {layout, grid, settings} = this;
    if (!layout?.machine || !grid || !this.full()) {
      return null;
    }
    return {
      layout,
      pixelRatio: this.pixelRatio(),
      quality: this.quality(),
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
    if (!this.moves()) {
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

  private movingGrain() {
    return this.moves() && this.lampOn() && this.settings.lighting.grain >= MOVING_GRAIN;
  }

  private ambient() {
    return this.movingGrain() || (this.moves() && this.lampOn() && this.settings.lighting.particles > 0);
  }

  private machineState(): MachineState {
    return {
      headX: this.carriage.position,
      sway: this.sway.position,
      strike: this.strike.position / STRIKE_TRAVEL,
      vibrator: this.vibrator.position / VIBRATOR_LIFT,
      spool: this.spool,
      platenTurn: this.platen.position / 360,
      lamp: this.lampOn(),
      intensity: this.settings.lighting.intensity
    };
  }

  private frame(now: number) {
    this.frameRequest = 0;
    const interval = this.lastTime ? now - this.lastTime : 0;
    const dt = interval ? Math.min(0.05, interval / 1000) : 1 / 60;
    this.lastTime = now;
    const {layout} = this;
    const theme = this.theme();
    if (!layout || !theme) {
      return;
    }
    const stillMoving = this.step(dt);
    if (stillMoving) {
      this.watchFrameRate(interval);
    }
    const motion = stillMoving ? 'moving' : 'still';
    if (this.elements.stage.dataset.motion !== motion) {
      this.elements.stage.dataset.motion = motion;
    }
    const ambient = this.ambient();
    const ambientDue = ambient && now - this.lastAmbient >= AMBIENT_INTERVAL;
    const effects = this.effects();
    const paper = activePaper(this.settings);
    // The model and the paper light are the heavy layers; constrained, they are redrawn sparingly.
    const heavyDue = !this.constrained || now - this.lastHeavy >= CONSTRAINED_INTERVAL;
    let deferred = false;

    const state = this.machineState();
    const look = machineLook(state);
    const lightLook = `${Math.round(state.headX * 4)},${state.lamp}`;
    const lightChanged = this.dirty || lightLook !== this.drawnLight;

    if (effects && this.full()) {
      const rig = this.rig(theme, layout);
      const grainDue = ambientDue && this.movingGrain();
      if (lightChanged || grainDue) {
        if (heavyDue) {
          this.paperLight?.render(this.lightFrame(rig, theme, paper, now));
          this.drawnLight = lightLook;
          this.lastHeavy = now;
        } else {
          deferred = true;
        }
      }
      if (lightChanged || ambientDue || this.cursorMoved) {
        this.glow.render(this.glowFrame(rig, theme, paper, layout, now));
      }
      if (ambientDue) {
        this.lastAmbient = now;
      }
    } else if (this.dirty) {
      this.glow.clear();
    }

    if (layout.machine && this.full() && (this.dirty || look !== this.drawnMachine)) {
      if (heavyDue || this.lastHeavy === now) {
        // While its shaders compile the model is not drawn; it asks for a frame once they are ready.
        if (this.machine?.render(state)) {
          this.drawnMachine = look;
          this.elements.stage.dataset.machine = 'drawn';
        }
        this.lastHeavy = now;
      } else {
        deferred = true;
      }
    }

    const viewport = this.inkViewport(layout);
    const inking = this.ink.render(now, this.inkStyle(paper, effects), viewport);
    const selecting = this.selection.render(now, this.selectionLook(paper), viewport);
    this.dirty = this.dirty && deferred;
    this.cursorMoved = false;
    if (stillMoving || ambient || inking || selecting || deferred) {
      this.schedule();
    } else {
      this.lastTime = 0;
    }
  }

  /** Switches to constrained mode when animation frames stay slow (a weak or busy GPU). */
  private watchFrameRate(interval: number) {
    if (this.constrained || interval <= 0 || interval > 1000) {
      return;
    }
    this.slowFrames = interval > SLOW_FRAME_MS ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames >= SLOW_FRAMES_LIMIT) {
      this.constrain('animation frames are slow');
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
    // The room's colour tints the shadow; moonlit shadow is markedly blue, as night shadow looks.
    const strength = rig.source === 'moonlight' ? 0.75 : 0.4;
    const tint = (c: number) => 1 + (0.6 + c * 1.5 - 1) * strength;
    return {
      rig,
      lamp: this.lampOn(),
      tint: toUnit(lightColorOf(theme, this.settings)),
      ambient,
      ambientTint: [tint(room[0]), tint(room[1]), tint(room[2])] as [number, number, number],
      relief: 2 * lighting.paperIllumination,
      grain: lighting.grain,
      // Subtle grain is a still texture; strong grain flickers like film.
      time: this.movingGrain() ? now / 1000 : 0,
      soft: lighting.beam === 'soft'
    };
  }

  private glowFrame(rig: LightRig, theme: NocturneTheme, paper: Paper, layout: StageLayout, now: number) {
    const {lighting} = this.settings;
    const light = toUnit(lightColorOf(theme, this.settings));
    const [r, g, b] = light.map((c) => Math.round(c * 255));
    // On a dark sheet the lamp shows as the paper itself lit, warm and dim (its colour times the
    // light's), not as a haze of the lamp's colour laid over it.
    let pool = [r, g, b];
    if (paper.appearance === 'dark') {
      const sheet = toUnit(paper.paper);
      pool = light.map((c, i) => Math.min(255, Math.round(c * sheet[i] * 600)));
    }
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
      poolRgb: pool.join(', '),
      appearance: paper.appearance,
      intensity: lighting.intensity,
      particles: this.moves() ? lighting.particles : 0,
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
      impression: effects && paperEffectsOn(this.settings) ? typewriter.impression : 0
    };
  }

  private selectionLook(paper: Paper): SelectionLook {
    const {typography} = this.settings;
    return {
      ...this.inkStyle(paper, true),
      paper: paper.paper,
      wash: typography.selection || paper.selection,
      enabled: inkSelectionOn(this.settings)
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
      cellWidth: grid.cellWidth,
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
