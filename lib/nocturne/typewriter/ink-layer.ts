// The type impression: when a character the user typed has been echoed by the program, the slug
// has just hit the paper, so for a moment the glyph is heavier and its ink spreads a little, then
// it settles into ordinary print. Drawn into a 2D canvas over the sheet, exactly on top of the
// glyph xterm.js rendered, and only ever for characters xterm itself has drawn (hidden input such
// as passwords never produces a strike). Nothing is delayed: the real glyph is already there.

import type {AnsiColors} from '../../../app/nocturne/types';
import type {StrikeEvent} from '../bus';

const SETTLE_MS = 420;

const ANSI_ORDER: (keyof AnsiColors)[] = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'lightBlack',
  'lightRed',
  'lightGreen',
  'lightYellow',
  'lightBlue',
  'lightMagenta',
  'lightCyan',
  'lightWhite'
];

export type InkStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontWeightBold: number;
  letterSpacing: number;
  ink: string;
  ansi: AnsiColors;
  /** Strength of the impression, 0–1 (0 = off). */
  impression: number;
};

/** Where the active terminal's rows are now, so a strike follows its line when the page scrolls. */
export type InkViewport = {
  /** Sheet-relative position of the text grid. */
  left: number;
  top: number;
  cellHeight: number;
  cellWidth: number;
  /** Buffer line shown in the top row. */
  viewportY: number;
};

type Strike = StrikeEvent & {at: number};

/** The colour xterm.js gives a cell: default ink, one of the 16 ANSI colours, or a true colour. */
export function glyphColor(fg: StrikeEvent['fg'], style: InkStyle): string {
  if (typeof fg === 'string') {
    return fg;
  }
  if (typeof fg === 'number' && fg < 16) {
    return style.ansi[ANSI_ORDER[fg]];
  }
  return style.ink;
}

/**
 * Sets the font of a glyph and measures it as xterm.js does: the glyph box is centred in the cell
 * and drawn on the ideographic baseline.
 */
export function glyphMetrics(c: CanvasRenderingContext2D, style: InkStyle, bold: boolean, viewport: InkViewport) {
  const weight = bold ? style.fontWeightBold : style.fontWeight;
  c.font = `${weight} ${style.fontSize}px ${style.fontFamily}`;
  const metrics = c.measureText('W');
  const charHeight = Math.ceil(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
  return {charHeight, charTop: Math.round((viewport.cellHeight - charHeight) / 2)};
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export class InkLayer {
  private context: CanvasRenderingContext2D | null;
  private strikes: Strike[] = [];
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private drawn = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.drawn = false;
  }

  add(strike: StrikeEvent, now: number) {
    this.strikes.push({...strike, at: now});
    if (this.strikes.length > 64) {
      this.strikes.shift();
    }
  }

  /** Forget every strike (the terminal changed, or the effect was turned off). */
  reset() {
    this.strikes = [];
    if (this.drawn) {
      this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawn = false;
    }
  }

  get active() {
    return this.strikes.length > 0;
  }

  /** Draws the strikes that are still settling; returns whether any remain. */
  render(now: number, style: InkStyle, viewport: InkViewport | null) {
    const c = this.context;
    this.strikes = this.strikes.filter((strike) => now - strike.at < SETTLE_MS);
    if (!c || (!this.drawn && this.strikes.length === 0)) {
      return this.strikes.length > 0;
    }
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.clearRect(0, 0, this.width, this.height);
    this.drawn = false;
    if (!viewport || style.impression <= 0) {
      return this.strikes.length > 0;
    }
    c.textBaseline = 'ideographic';
    for (const strike of this.strikes) {
      const k = (1 - smooth((now - strike.at) / SETTLE_MS)) * style.impression;
      const {charHeight, charTop} = glyphMetrics(c, style, strike.bold, viewport);
      const x = viewport.left + strike.col * strike.cellWidth + Math.floor(style.letterSpacing / 2);
      const top = viewport.top + (strike.line - viewport.viewportY) * viewport.cellHeight;
      if (top < -viewport.cellHeight || top > this.height) {
        continue;
      }
      const baseline = top + charTop + charHeight;
      const color = glyphColor(strike.fg, style);
      const scale = 1 + 0.07 * k;
      const cx = x + strike.width / 2;
      const cy = top + viewport.cellHeight / 2;
      c.save();
      c.translate(cx, cy);
      c.scale(scale, scale);
      c.translate(-cx, -cy);
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 2.4 * k * this.pixelRatio;
      c.globalAlpha = Math.min(1, k);
      c.fillText(strike.char, x, baseline);
      c.shadowBlur = 0;
      c.globalAlpha = 0.55 * k;
      c.fillText(strike.char, x + 0.35, baseline + 0.25);
      c.restore();
      this.drawn = true;
    }
    return this.strikes.length > 0;
  }
}
