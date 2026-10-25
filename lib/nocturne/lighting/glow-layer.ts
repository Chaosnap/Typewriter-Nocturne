// Light that adds rather than multiplies, drawn into a 2D canvas over the sheet with
// `mix-blend-mode: screen`: dust motes drifting through the beam (each lit by the same light model
// as the paper), the glare of the carriage bulb, and a faint glow round the cursor.

import {lightAmount} from '../../../app/nocturne/light-model';
import type {LightRig} from '../../../app/nocturne/light-model';

export type GlowFrame = {
  rig: LightRig;
  lamp: boolean;
  /** Light colour as `r, g, b` (0–255). */
  rgb: string;
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

export class GlowLayer {
  private context: CanvasRenderingContext2D | null;
  private sprite: HTMLCanvasElement;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;

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
