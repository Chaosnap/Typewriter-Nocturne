// The ink selection. Instead of xterm's flat box, selected text lies under a soft, feathered wash,
// and as each character is taken into the selection it dissolves like a drop of ink in water,
// throws a few specks of ink, and re-forms. Drawn into a 2D canvas over the sheet, exactly on the
// glyphs xterm.js has drawn; xterm's own selection is made invisible meanwhile (apply-config.ts).
// Selecting, copying and every other part of xterm's selection are untouched.

import type {SelectedCell} from '../bus';

import {glyphColor, glyphMetrics} from './ink-layer';
import type {InkStyle, InkViewport} from './ink-layer';

const DISSOLVE_MS = 680;
/** Characters entering the selection together ripple from the first to the last. */
const STAGGER_MS = 7;
const MAX_STAGGER_MS = 320;
/** Above these, a selection only gets the wash, and the dissolve no blur: the effect stays light. */
const MAX_ANIMATED = 900;
const MAX_BLURRED = 260;

export type SelectionLook = InkStyle & {
  /** The paper colour that briefly covers a dissolving glyph. */
  paper: string;
  /** The wash under selected text. */
  wash: string;
  enabled: boolean;
};

type Animated = SelectedCell & {start: number};

const key = (cell: SelectedCell) => `${cell.line}:${cell.col}`;

const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export class SelectionLayer {
  private context: CanvasRenderingContext2D | null;
  private cells: SelectedCell[] = [];
  private selected = new Set<string>();
  private animated: Animated[] = [];
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private drawnKey = '';

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.drawnKey = '';
  }

  /** The selection changed: characters newly taken into it start to dissolve. */
  set(cells: SelectedCell[], now: number, animate: boolean) {
    const next = new Set(cells.map(key));
    const fresh = animate && cells.length <= MAX_ANIMATED ? cells.filter((cell) => !this.selected.has(key(cell))) : [];
    this.animated = this.animated.filter((cell) => next.has(key(cell)));
    fresh.forEach((cell, i) => {
      this.animated.push({...cell, start: now + Math.min(MAX_STAGGER_MS, i * STAGGER_MS)});
    });
    this.cells = cells;
    this.selected = next;
    this.drawnKey = '';
  }

  /** Draws the wash and the dissolving characters; returns whether an animation is running. */
  render(now: number, style: SelectionLook, viewport: InkViewport | null) {
    const c = this.context;
    this.animated = this.animated.filter((cell) => now - cell.start < DISSOLVE_MS);
    const animating = this.animated.length > 0;
    const view = viewport ? `${viewport.left},${viewport.top},${viewport.viewportY},${viewport.cellHeight}` : '';
    const drawKey = `${style.enabled},${view},${this.cells.length},${style.wash},${style.fontSize}`;
    if (!c || (!animating && drawKey === this.drawnKey)) {
      return animating;
    }
    this.drawnKey = animating ? '' : drawKey;
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    if (!style.enabled || !viewport || this.cells.length === 0) {
      return animating;
    }
    this.drawWash(c, style, viewport);
    if (animating) {
      this.drawDissolve(c, now, style, viewport);
    }
    return animating;
  }

  private top(line: number, viewport: InkViewport) {
    return viewport.top + (line - viewport.viewportY) * viewport.cellHeight;
  }

  /** A soft wash under each run of selected characters, feathered like a brush stroke. */
  private drawWash(c: CanvasRenderingContext2D, style: SelectionLook, viewport: InkViewport) {
    const runs = new Map<number, {from: number; to: number}>();
    for (const cell of this.cells) {
      const run = runs.get(cell.line);
      const to = cell.col + cell.width;
      runs.set(cell.line, run ? {from: Math.min(run.from, cell.col), to: Math.max(run.to, to)} : {from: cell.col, to});
    }
    c.save();
    c.fillStyle = style.wash;
    c.shadowColor = style.wash;
    c.shadowBlur = 6 * this.pixelRatio;
    for (const [line, run] of runs) {
      const top = this.top(line, viewport);
      if (top < -viewport.cellHeight || top > this.height) {
        continue;
      }
      const x = viewport.left + run.from * viewport.cellWidth - 2;
      const width = (run.to - run.from) * viewport.cellWidth + 4;
      const inset = viewport.cellHeight * 0.12;
      c.beginPath();
      c.roundRect(x, top + inset, width, viewport.cellHeight - inset * 2, viewport.cellHeight * 0.35);
      c.fill();
    }
    c.restore();
  }

  /** Each new character: covered by paper, its ink spreads and fades, then gathers back. */
  private drawDissolve(c: CanvasRenderingContext2D, now: number, style: SelectionLook, viewport: InkViewport) {
    const blur = this.animated.length <= MAX_BLURRED;
    c.textBaseline = 'ideographic';
    for (const cell of this.animated) {
      const t = (now - cell.start) / DISSOLVE_MS;
      if (t < 0) {
        continue;
      }
      const top = this.top(cell.line, viewport);
      if (top < -viewport.cellHeight || top > this.height) {
        continue;
      }
      const x = viewport.left + cell.col * viewport.cellWidth;
      const width = viewport.cellWidth * cell.width;
      const metrics = glyphMetrics(c, style, cell.bold, viewport);
      const baseline = top + metrics.charTop + metrics.charHeight;
      const color = glyphColor(cell.fg, style);
      // The paper hides xterm's glyph while the ink is dispersed.
      const cover = t < 0.3 ? ease(t / 0.3) : 1 - ease((t - 0.7) / 0.3);
      c.globalAlpha = Math.max(0, cover);
      c.fillStyle = style.paper;
      c.fillRect(x - 1, top, width + 2, viewport.cellHeight);
      // Dissolving until the middle, re-forming after it.
      const spread = t < 0.5 ? ease(t / 0.5) : 1 - ease((t - 0.5) / 0.5);
      c.globalAlpha = 1 - spread * 0.85;
      c.fillStyle = color;
      if (blur) {
        c.shadowColor = color;
        c.shadowBlur = spread * 5 * this.pixelRatio;
      }
      c.save();
      const cx = x + width / 2;
      const cy = top + viewport.cellHeight / 2;
      c.translate(cx, cy);
      c.scale(1 + spread * 0.18, 1 + spread * 0.18);
      c.translate(-cx, -cy);
      c.fillText(cell.char, x, baseline);
      c.restore();
      c.shadowBlur = 0;
      // A few specks of ink drift out and come back.
      c.globalAlpha = spread * 0.55;
      for (let i = 0; i < 3; i++) {
        const angle = ((cell.col * 7 + cell.line * 13 + i * 120) % 360) * (Math.PI / 180);
        const distance = spread * viewport.cellHeight * (0.45 + i * 0.18);
        c.beginPath();
        c.arc(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, 0.9 + i * 0.25, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }
}
