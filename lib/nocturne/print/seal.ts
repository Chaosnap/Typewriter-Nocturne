// A wax seal on a silk ribbon, drawn on a canvas: an irregular pool of wax with a raised, glossy
// lip and a few spilled drops, a pressed field with a beaded border, an embossed monogram under an
// emblem, and soft highlights where the light catches the wax. Deterministic for a given seed, so
// a folio's seal looks the same every time it is drawn.

import type {SealColor, SealEmblem} from '../../../app/nocturne/types';

export type SealStyle = {
  seed: number;
  monogram: string;
  color: SealColor;
  emblem: SealEmblem;
  ribbon: boolean;
  /** Font stack for the monogram. */
  display: string;
};

type Palette = {
  /** Lit, body and shadowed wax. */
  wax: [string, string, string];
  /** The pressed field: its lit side and its deep side. */
  field: [string, string];
  /** Embossing: the shadowed and the lit edge of a raised shape. */
  shade: string;
  light: string;
  /** Silk: shadow, sheen, body. */
  silk: [string, string, string];
};

export const SEAL_PALETTES: Record<SealColor, Palette> = {
  crimson: {
    wax: ['#d8493a', '#9a2218', '#560c08'],
    field: ['#a52b20', '#6c140e'],
    shade: 'rgba(48, 6, 3, 0.72)',
    light: 'rgba(255, 196, 178, 0.5)',
    silk: ['#4e100c', '#a03024', '#6a1812']
  },
  oxblood: {
    wax: ['#9c3436', '#5e161b', '#2c0609'],
    field: ['#6d1f24', '#3d0b0f'],
    shade: 'rgba(24, 3, 4, 0.75)',
    light: 'rgba(240, 170, 170, 0.36)',
    silk: ['#24100e', '#6b4a3c', '#3a2620']
  },
  black: {
    wax: ['#6a6a70', '#28282d', '#09090b'],
    field: ['#34343a', '#141417'],
    shade: 'rgba(0, 0, 0, 0.8)',
    light: 'rgba(230, 230, 240, 0.32)',
    silk: ['#3c0e0c', '#8e2a20', '#5a1612']
  },
  gold: {
    wax: ['#f6dc8c', '#c39532', '#6a470c'],
    field: ['#d2a646', '#8d6418'],
    shade: 'rgba(72, 44, 4, 0.66)',
    light: 'rgba(255, 248, 214, 0.7)',
    silk: ['#121c3c', '#3a5596', '#1f2f62']
  },
  emerald: {
    wax: ['#46a577', '#1c5f40', '#0a2b1c'],
    field: ['#2a7a54', '#123e2a'],
    shade: 'rgba(3, 26, 16, 0.75)',
    light: 'rgba(196, 255, 222, 0.38)',
    silk: ['#3a2a0a', '#b38a3a', '#6e5218']
  },
  sapphire: {
    wax: ['#5b80d4', '#22408a', '#0c1a42'],
    field: ['#2f53a6', '#152a62'],
    shade: 'rgba(4, 10, 36, 0.75)',
    light: 'rgba(206, 222, 255, 0.45)',
    silk: ['#2c2e36', '#a7aab4', '#5c5f6a']
  }
};

/** A small deterministic random generator (mulberry32). */
function random(seed: number) {
  let state = Math.floor(seed * 1e6) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two silk tails with forked ends, with the sheen of silk along their length. */
function ribbon(c: CanvasRenderingContext2D, x: number, y: number, r: number, palette: Palette) {
  const [shadow, sheen, body] = palette.silk;
  for (const side of [-1, 1]) {
    const tipX = x + side * r * 1.05;
    const tipY = y + r * 2.25;
    c.save();
    c.beginPath();
    c.moveTo(x + side * r * 0.08, y - r * 0.1);
    c.bezierCurveTo(x + side * r * 0.4, y + r * 0.3, x + side * r * 0.62, y + r * 0.9, tipX + side * r * 0.2, tipY);
    c.lineTo(tipX - side * r * 0.04, tipY - r * 0.3);
    c.lineTo(tipX - side * r * 0.36, tipY + r * 0.04);
    c.bezierCurveTo(x - side * r * 0.04, y + r * 1.2, x - side * r * 0.1, y + r * 0.5, x - side * r * 0.2, y);
    c.closePath();
    c.shadowColor = 'rgba(20, 8, 4, 0.35)';
    c.shadowBlur = r * 0.12;
    c.shadowOffsetY = r * 0.04;
    const silk = c.createLinearGradient(x - side * r * 0.3, y, x + side * r * 0.9, y + r * 0.4);
    silk.addColorStop(0, shadow);
    silk.addColorStop(0.42, sheen);
    silk.addColorStop(0.62, body);
    silk.addColorStop(1, shadow);
    c.fillStyle = silk;
    c.fill();
    c.shadowColor = 'transparent';
    // Fine threads of the weave along the tail.
    c.clip();
    c.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    c.lineWidth = 0.6;
    for (let i = -6; i <= 6; i++) {
      c.beginPath();
      c.moveTo(x + i * r * 0.07, y);
      c.lineTo(tipX + i * r * 0.07, tipY + r * 0.1);
      c.stroke();
    }
    c.restore();
  }
}

/** The outline of the wax: a pool that spread unevenly before it was pressed. */
function pool(c: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number) {
  c.beginPath();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const slow = 0.055 * Math.sin(3 * t + seed) + 0.035 * Math.sin(5 * t + seed * 2.1);
    const wobble = slow + 0.02 * Math.sin(11 * t + seed * 3.3) + 0.01 * Math.sin(23 * t + seed);
    const px = x + Math.cos(t) * r * (1 + wobble);
    const py = y + Math.sin(t) * r * (1 + wobble);
    if (i === 0) {
      c.moveTo(px, py);
    } else {
      c.lineTo(px, py);
    }
  }
  c.closePath();
}

function waxGradient(c: CanvasRenderingContext2D, x: number, y: number, r: number, palette: Palette) {
  const [lit, body, dark] = palette.wax;
  const wax = c.createRadialGradient(x - r * 0.34, y - r * 0.38, r * 0.06, x, y, r * 1.12);
  wax.addColorStop(0, lit);
  wax.addColorStop(0.5, body);
  wax.addColorStop(1, dark);
  return wax;
}

/** A few drops of wax that ran off the pool. */
function drops(c: CanvasRenderingContext2D, x: number, y: number, r: number, palette: Palette, next: () => number) {
  for (let i = 0; i < 3; i++) {
    const angle = next() * Math.PI * 2;
    const distance = r * (1.02 + next() * 0.12);
    const size = r * (0.06 + next() * 0.07);
    const dx = x + Math.cos(angle) * distance;
    const dy = y + Math.sin(angle) * distance;
    c.beginPath();
    c.ellipse(dx, dy, size * 1.2, size, angle, 0, Math.PI * 2);
    c.fillStyle = waxGradient(c, dx, dy, size * 1.4, palette);
    c.fill();
  }
}

function emboss(c: CanvasRenderingContext2D, palette: Palette, r: number, draw: () => void) {
  c.save();
  c.fillStyle = palette.shade;
  c.translate(r * 0.028, r * 0.034);
  draw();
  c.restore();
  c.save();
  c.fillStyle = palette.light;
  c.translate(-r * 0.022, -r * 0.026);
  draw();
  c.restore();
  c.save();
  c.fillStyle = palette.field[0];
  draw();
  c.restore();
}

function crescent(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r * 0.12, Math.PI * 0.25, Math.PI * 1.75, false);
  c.arc(x + r * 0.05, y - r * 0.01, r * 0.095, Math.PI * 1.65, Math.PI * 0.35, true);
  c.closePath();
  c.fill();
  for (const [sx, sy, size] of [
    [-0.24, 0.05, 0.03],
    [0.22, -0.02, 0.034],
    [0.3, 0.1, 0.022]
  ]) {
    c.beginPath();
    c.arc(x + sx * r, y + sy * r, size * r, 0, Math.PI * 2);
    c.fill();
  }
}

function rose(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Five petals round a seeded heart, as heraldic roses are drawn, with two small leaves.
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    c.beginPath();
    c.arc(x + Math.cos(angle) * r * 0.065, y + Math.sin(angle) * r * 0.065, r * 0.065, 0, Math.PI * 2);
    c.fill();
  }
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + side * r * 0.2, y + r * 0.04, r * 0.08, r * 0.028, side * 0.35, 0, Math.PI * 2);
    c.fill();
  }
}

function quill(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // A feather laid on the slant: the vane, then the shaft to its nib.
  c.save();
  c.translate(x, y);
  c.rotate(-0.55);
  c.beginPath();
  c.moveTo(-r * 0.26, 0);
  c.bezierCurveTo(-r * 0.12, -r * 0.1, r * 0.12, -r * 0.09, r * 0.22, -r * 0.01);
  c.bezierCurveTo(r * 0.1, r * 0.06, -r * 0.1, r * 0.06, -r * 0.26, 0);
  c.fill();
  c.fillRect(-r * 0.34, -r * 0.008, r * 0.62, r * 0.016);
  c.restore();
}

/** Draws the seal centred at (x, y) with radius r. */
export function drawSeal(c: CanvasRenderingContext2D, x: number, y: number, r: number, style: SealStyle) {
  const palette = SEAL_PALETTES[style.color];
  const next = random(style.seed);
  c.save();
  if (style.ribbon) {
    ribbon(c, x, y, r, palette);
  }

  // The wax, with its shadow on the paper and a few drops that ran off.
  c.save();
  c.shadowColor = 'rgba(30, 10, 4, 0.5)';
  c.shadowBlur = r * 0.2;
  c.shadowOffsetY = r * 0.07;
  pool(c, x, y, r, style.seed);
  c.fillStyle = waxGradient(c, x, y, r, palette);
  c.fill();
  c.restore();
  drops(c, x, y, r, palette, next);

  // The lip: wax pushed up round the matrix, lit on its upper left, shaded on its lower right.
  c.save();
  pool(c, x, y, r * 0.93, style.seed);
  c.lineWidth = r * 0.1;
  const lip = c.createLinearGradient(x - r, y - r, x + r, y + r);
  lip.addColorStop(0, palette.light);
  lip.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  lip.addColorStop(1, palette.shade);
  c.strokeStyle = lip;
  c.stroke();
  c.restore();

  // The pressed field, sunk below the lip.
  const fieldRadius = r * 0.72;
  c.beginPath();
  c.arc(x, y, fieldRadius, 0, Math.PI * 2);
  const field = c.createRadialGradient(x + r * 0.22, y + r * 0.26, r * 0.04, x, y, r * 0.78);
  field.addColorStop(0, palette.field[0]);
  field.addColorStop(1, palette.field[1]);
  c.fillStyle = field;
  c.fill();
  // Its wall: in shadow above (the light comes from the upper left), lit below.
  c.lineWidth = r * 0.05;
  c.strokeStyle = palette.shade;
  c.beginPath();
  c.arc(x, y, fieldRadius, Math.PI * 0.9, Math.PI * 1.85);
  c.stroke();
  c.strokeStyle = palette.light;
  c.lineWidth = r * 0.03;
  c.beginPath();
  c.arc(x, y, fieldRadius, Math.PI * 1.95, Math.PI * 0.8);
  c.stroke();

  // A beaded border inside the field, as a seal matrix is engraved.
  const beads = 30;
  for (let i = 0; i < beads; i++) {
    const angle = (i / beads) * Math.PI * 2;
    const bx = x + Math.cos(angle) * r * 0.62;
    const by = y + Math.sin(angle) * r * 0.62;
    emboss(c, palette, r * 0.5, () => {
      c.beginPath();
      c.arc(bx, by, r * 0.026, 0, Math.PI * 2);
      c.fill();
    });
  }

  // The monogram, embossed, lowered when an emblem sits above it.
  const letters = Array.from(style.monogram);
  const size = Math.round(r * (letters.length > 1 ? 0.62 : 0.86) * (style.emblem === 'none' ? 1.08 : 1));
  const baseline = y + (style.emblem === 'none' ? r * 0.04 : r * 0.13);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 ${size}px ${style.display}`;
  emboss(c, palette, r, () => c.fillText(style.monogram, x, baseline));

  const emblemY = y - r * 0.38;
  if (style.emblem === 'moon') {
    emboss(c, palette, r * 0.6, () => crescent(c, x, emblemY, r));
  } else if (style.emblem === 'rose') {
    emboss(c, palette, r * 0.6, () => rose(c, x, emblemY, r));
  } else if (style.emblem === 'quill') {
    emboss(c, palette, r * 0.6, () => quill(c, x, emblemY, r));
  }

  // The grain of the wax: tiny pits and bubbles.
  c.save();
  pool(c, x, y, r, style.seed);
  c.clip();
  for (let i = 0; i < 46; i++) {
    const angle = next() * Math.PI * 2;
    const distance = Math.sqrt(next()) * r;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    c.beginPath();
    c.arc(px, py, r * (0.006 + next() * 0.012), 0, Math.PI * 2);
    c.fillStyle = next() > 0.5 ? palette.shade : palette.light;
    c.globalAlpha = 0.35;
    c.fill();
  }
  c.globalAlpha = 1;

  // Highlights on the curved wax: a broad soft sheen and a sharp glint on the lip.
  const sheen = c.createRadialGradient(x - r * 0.45, y - r * 0.5, 0, x - r * 0.45, y - r * 0.5, r * 0.5);
  sheen.addColorStop(0, 'rgba(255, 244, 236, 0.28)');
  sheen.addColorStop(1, 'rgba(255, 244, 236, 0)');
  c.fillStyle = sheen;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.beginPath();
  c.ellipse(x - r * 0.52, y - r * 0.58, r * 0.2, r * 0.05, -0.75, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255, 250, 244, 0.5)';
  c.fill();
  c.beginPath();
  c.arc(x, y, r * 0.86, Math.PI * 1.08, Math.PI * 1.36);
  c.lineWidth = r * 0.025;
  c.strokeStyle = 'rgba(255, 250, 244, 0.45)';
  c.lineCap = 'round';
  c.stroke();
  c.restore();
  c.restore();
}
