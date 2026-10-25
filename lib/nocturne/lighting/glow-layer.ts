// Light that adds rather than multiplies, drawn into a 2D canvas over the sheet with
// `mix-blend-mode: screen`: the pool of light itself with a soft bloom round it (the paper light
// below can only darken, so on a dark sheet a lamp shows only through this layer), dust motes
// drifting through the beam (each lit by the same light model as the paper), the glare of the
// carriage bulb, the warm spill of a desk lamp, and a faint glow round the cursor.

import {lightAmount} from '../../../app/nocturne/light-model';
import type {LightRig} from '../../../app/nocturne/light-model';

export type GlowFrame = {
  rig: LightRig;
  lamp: boolean;
  /** Light colour as `r, g, b` (0–255). */
  rgb: string;
  /** Colour of the pool of light as `r, g, b`: on a dark sheet, the paper itself lit. */
  poolRgb: string;
  appearance: 'light' | 'dark';
  intensity: number;
  /** Dust in the beam, 0–1 (0 = none). */
  particles: number;
  /** Cursor glow, 0–1; the cursor centre in sheet coordinates. */
  cursorGlow: number;
  cursor: {x: number; y: number} | null;
  time: number;
};

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const MOTES = Array.from({length: 110}, (_, i) => ({
  x: hash(i * 3.1),
  y: hash(i * 7.7),
  z: hash(i * 1.9),
  phase: hash(i * 5.3) * 100,
  size: 0.5 + hash(i * 9.1) * 1.6
}));

const wrap = (value: number) => ((value % 1) + 1) % 1;

/** Columns of the low-resolution light pool; rows follow the sheet's proportions. */
const POOL_COLUMNS = 192;

/**
 * How strongly the pool of light is added. On a dark sheet it is the lamp's only light, and its
 * colour is the paper's own, lit, dim enough that ink still reads at 4.5:1 in the brightest spot;
 * on a light sheet the paper light shows the lamp already, and the pool only lends moonlight its
 * glow and a desk lamp its warmth.
 */
function poolStrength(frame: GlowFrame) {
  if (frame.appearance === 'dark') {
    return 1;
  }
  if (frame.rig.source === 'moonlight') {
    return 0.2;
  }
  return frame.rig.source === 'desk-lamp' ? 0.1 : 0;
}

export class GlowLayer {
  private context: CanvasRenderingContext2D | null;
  private sprite: HTMLCanvasElement;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private pool = document.createElement('canvas');
  private soft = document.createElement('canvas');
  private bloom = document.createElement('canvas');
  private poolKey = '';

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
    this.sprite = document.createElement('canvas');
    this.sprite.width = 32;
    this.sprite.height = 32;
    const s = this.sprite.getContext('2d');
    if (s) {
      const gradient = s.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.22, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      s.fillStyle = gradient;
      s.fillRect(0, 0, 32, 32);
    }
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
  }

  /**
   * The light falling on the sheet as a picture: computed from the light model at low resolution
   * once per change of the light, softened by a pixel so its edges never step where the beam
   * narrows to the bulb, with a blurred copy for the glow that light has round it.
   */
  private ensurePool(rig: LightRig, rgb: string) {
    const key = JSON.stringify([rig, rgb, this.width, this.height]);
    if (key === this.poolKey) {
      return;
    }
    this.poolKey = key;
    const columns = POOL_COLUMNS;
    const rows = Math.max(8, Math.round((columns * this.height) / Math.max(1, this.width)));
    const [r, g, b] = rgb.split(',').map(Number);
    for (const canvas of [this.pool, this.soft, this.bloom]) {
      canvas.width = columns;
      canvas.height = rows;
    }
    const p = this.pool.getContext('2d');
    const o = this.soft.getContext('2d');
    const q = this.bloom.getContext('2d');
    if (!p || !o || !q) {
      return;
    }
    const image = p.createImageData(columns, rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        const lit = lightAmount(rig, ((i + 0.5) / columns) * this.width, ((j + 0.5) / rows) * this.height);
        const k = (j * columns + i) * 4;
        image.data[k] = r;
        image.data[k + 1] = g;
        image.data[k + 2] = b;
        image.data[k + 3] = Math.round(Math.min(1, lit) * 255);
      }
    }
    p.putImageData(image, 0, 0);
    o.filter = 'blur(1px)';
    o.drawImage(this.pool, 0, 0);
    o.filter = 'none';
    q.filter = 'blur(6px)';
    q.drawImage(this.pool, 0, 0);
    q.filter = 'none';
  }

  clear() {
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(frame: GlowFrame) {
    const {context: c, width, height} = this;
    if (!c) {
      return;
    }
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.clearRect(0, 0, width, height);
    if (!frame.lamp) {
      return;
    }
    const {rig} = frame;
    const seconds = frame.time;
    const pool = poolStrength(frame);
    if (pool > 0) {
      this.ensurePool(rig, frame.poolRgb);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.globalAlpha = pool;
      c.drawImage(this.soft, 0, 0, width, height);
      c.globalAlpha = pool * (frame.appearance === 'dark' ? 0.4 : 0.8);
      c.drawImage(this.bloom, 0, 0, width, height);
      c.globalAlpha = 1;
    }
    if (rig.source === 'desk-lamp') {
      // The lamp stands just off the sheet: its warm spill colours the corner nearest to it.
      const [x, y] = rig.position;
      const radius = Math.max(1, height * 0.55);
      const spill = c.createRadialGradient(x, y, 0, x, y, radius);
      spill.addColorStop(0, `rgba(${frame.rgb}, ${frame.appearance === 'light' ? 0.1 : 0.16})`);
      spill.addColorStop(1, `rgba(${frame.rgb}, 0)`);
      c.fillStyle = spill;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    if (frame.particles > 0) {
      const count = Math.round(MOTES.length * frame.particles);
      const strength = frame.appearance === 'light' ? 0.5 : 0.9;
      for (let i = 0; i < count; i++) {
        const m = MOTES[i];
        const speed = 0.4 + m.z;
        const drift = Math.sin(seconds * 0.05 * speed + m.phase) * 0.04 + seconds * 0.004 * (m.z - 0.5);
        const fall = -seconds * 0.006 * speed + Math.cos(seconds * 0.07 + m.phase) * 0.03;
        const x = wrap(m.x + drift) * width;
        const y = wrap(m.y + fall) * height;
        const lit = lightAmount(rig, x, y);
        if (lit < 0.05) {
          continue;
        }
        const twinkle = 0.5 + 0.5 * Math.sin(seconds * (0.8 + m.z * 2.2) + m.phase);
        const size = m.size * (1 + m.z * 1.6);
        c.globalAlpha = Math.min(1, lit * twinkle * strength);
        c.drawImage(this.sprite, x - size * 2, y - size * 2, size * 4, size * 4);
      }
      c.globalAlpha = 1;
    }
    if (rig.source === 'carriage') {
      const [x, y] = rig.position;
      const radius = Math.max(1, 110 * frame.intensity);
      const glare = c.createRadialGradient(x, y, 0, x, y, radius);
      // Softer on light paper, where a bright glare would wash out the lines under the bulb.
      glare.addColorStop(0, `rgba(${frame.rgb}, ${frame.appearance === 'light' ? 0.26 : 0.45})`);
      glare.addColorStop(1, `rgba(${frame.rgb}, 0)`);
      c.fillStyle = glare;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    if (frame.cursor && frame.cursorGlow > 0) {
      const {x, y} = frame.cursor;
      const glow = c.createRadialGradient(x, y, 0, x, y, 34);
      glow.addColorStop(0, `rgba(${frame.rgb}, ${(0.4 * frame.cursorGlow).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${frame.rgb}, 0)`);
      c.fillStyle = glow;
      c.fillRect(x - 34, y - 34, 68, 68);
    }
  }
}
