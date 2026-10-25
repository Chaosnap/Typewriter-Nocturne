// A wax seal on a silk ribbon, drawn on a canvas: an irregular pool of wax with a raised, glossy
// lip and a few spilled drops, a pressed field with a beaded border, an embossed monogram under an
// emblem, and soft highlights where the light catches the wax. Deterministic for a given seed, so
// a folio's seal looks the same every time it is drawn.

import type {RibbonColor, RibbonStyle, SealColor, SealEmblem} from '../../../app/nocturne/types';

export type SealStyle = {
  seed: number;
  monogram: string;
  color: SealColor;
  emblem: SealEmblem;
  /** How the silk ribbon is laid under the seal, or null for none. */
  ribbon: RibbonStyle | null;
  /** The silk's colour; `wax` (or none given) is the silk that goes with the wax. */
  silk?: RibbonColor;
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

/** Silk of a colour of its own: shadow, sheen, body. */
export const SILKS: Record<Exclude<RibbonColor, 'wax'>, [string, string, string]> = {
  crimson: ['#4e100c', '#c23a2c', '#7a1a12'],
  burgundy: ['#24080c', '#7a2a36', '#46121a'],
  navy: ['#121c3c', '#3a5596', '#1f2f62'],
  emerald: ['#0c2a1c', '#3f9468', '#1b553a'],
  gold: ['#3a2a0a', '#d6ae58', '#8a6522'],
  ivory: ['#6d6250', '#fbf4e2', '#d9cdb2'],
  black: ['#0a0a0c', '#4a4a52', '#1d1d22']
};

/** The silk of a seal: its own colour, or the one that goes with the wax. */
export const silkOf = (color: RibbonColor | undefined, wax: SealColor) =>
  !color || color === 'wax' ? SEAL_PALETTES[wax].silk : SILKS[color];

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

type Point = [number, number];
type RGB = [number, number, number];

const rgbOf = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16)
];

/** A colour between two, made lighter or darker. */
function tone(from: RGB, to: RGB, t: number, light: number) {
  const channels: number[] = [];
  for (let k = 0; k < 3; k++) {
    channels.push(Math.round(Math.min(255, Math.max(0, (from[k] + (to[k] - from[k]) * t) * light))));
  }
  return `rgb(${channels.join(', ')})`;
}

/** A point and the unit tangent on a cubic Bézier. */
function cubicAt([p0, p1, p2, p3]: Point[], t: number): {at: Point; tangent: Point} {
  const u = 1 - t;
  const at: Point = [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
  ];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const length = Math.hypot(dx, dy) || 1;
  return {at, tangent: [dx / length, dy / length]};
}

/** How an end of a band is finished: tucked under the seal, cut straight, or cut as a swallowtail. */
type Cut = 'hidden' | 'straight' | 'swallow';

/** A band of satin, in units of the seal's radius with the seal's centre at the origin. */
type Band = {
  /** The band's centre line, a cubic Bézier. */
  curve: Point[];
  width: number;
  start: Cut;
  end: Cut;
  /** Where along the band it turns over once, showing the matte back of the satin, if it does. */
  twist?: number;
  /** Where the sheen rises and falls along the band. */
  phase: number;
};

const flip = (band: Band, phase: number): Band => ({
  ...band,
  curve: band.curve.map(([px, py]): Point => [-px, py]),
  phase
});

/** A tail laid from under the seal down the page in a gentle S. */
const SWALLOWTAIL: Band = {
  curve: [
    [0.1, 0.05],
    [0.58, 0.62],
    [0.52, 1.5],
    [1.02, 2.32]
  ],
  width: 0.46,
  start: 'hidden',
  end: 'swallow',
  phase: 0.6
};

/** A straighter tail that crosses its fellow just under the seal. */
const DROP: Band = {
  curve: [
    [-0.15, 0.2],
    [0.15, 0.9],
    [0.45, 1.6],
    [0.75, 2.2]
  ],
  width: 0.36,
  start: 'hidden',
  end: 'swallow',
  phase: 1.4
};

/** A band coming down from above the seal, cut straight at its top. */
const HANGER: Band = {
  curve: [
    [0.02, -1.6],
    [-0.04, -1.1],
    [0.04, -0.5],
    [0, 0]
  ],
  width: 0.48,
  start: 'straight',
  end: 'hidden',
  phase: 0.3
};

/** One arm of a cross, swallowtailed at both ends. */
const CROSSING: Band = {
  curve: [
    [-1.45, -1.3],
    [-0.5, -0.42],
    [0.5, 0.48],
    [1.5, 1.4]
  ],
  width: 0.42,
  start: 'swallow',
  end: 'swallow',
  phase: 0.8
};

/** The bands of each way of laying the silk, the lowest first. */
const RIBBONS: Record<RibbonStyle, Band[]> = {
  tails: [SWALLOWTAIL, {...flip(SWALLOWTAIL, 2.2), twist: 0.5}],
  loop: [
    {
      curve: [
        [-0.32, -0.55],
        [-1.6, -2.55],
        [1.6, -2.55],
        [0.32, -0.55]
      ],
      width: 0.3,
      start: 'hidden',
      end: 'hidden',
      phase: 0.9
    },
    flip(DROP, 2.6),
    DROP
  ],
  band: [
    {
      curve: [
        [-0.04, -1.75],
        [0.08, -0.6],
        [-0.08, 0.9],
        [0.06, 2.25]
      ],
      width: 0.52,
      start: 'straight',
      end: 'swallow',
      phase: 1
    }
  ],
  cross: [CROSSING, flip(CROSSING, 2.4)],
  banner: [HANGER, flip({...DROP, width: 0.42}, 2.6), {...DROP, width: 0.42}],
  pendant: [
    HANGER,
    {
      curve: [
        [0.1, 0.1],
        [0.2, 0.9],
        [0.3, 1.6],
        [0.42, 2.15]
      ],
      width: 0.46,
      start: 'hidden',
      end: 'swallow',
      phase: 2
    },
    {
      curve: [
        [-0.05, 0.1],
        [-0.1, 1],
        [-0.02, 1.8],
        [-0.12, 2.55]
      ],
      width: 0.48,
      start: 'hidden',
      end: 'swallow',
      twist: 0.62,
      phase: 0.8
    }
  ]
};

/**
 * One band of the silk ribbon, for a seal at (x, y) of radius r. Its sheen rises and falls along
 * its length, its woven edges show as fine hems, a band with a twist turns over once on the way,
 * showing the matte back of the satin, and a swallowtail end is cut in a V with a few loose threads.
 */
function satinBand(c: CanvasRenderingContext2D, x: number, y: number, r: number, band: Band, silk: string[]) {
  const [shadow, sheen, body] = silk.map(rgbOf);
  const curve = band.curve.map(([px, py]): Point => [x + px * r, y + py * r]);
  const width = r * band.width;
  const steps = 44;
  const left: Point[] = [];
  const right: Point[] = [];
  const colors: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const {at, tangent} = cubicAt(curve, t);
    const normal: Point = [-tangent[1], tangent[0]];
    let half = width / 2;
    let back = false;
    // The half twist: the band narrows to its edge and turns over.
    if (band.twist !== undefined && t > band.twist) {
      const u = Math.min(1, (t - band.twist) / 0.18);
      half *= Math.max(0.04, Math.abs(Math.cos(Math.PI * u)));
      back = u > 0.5;
    }
    left.push([at[0] + normal[0] * half, at[1] + normal[1] * half]);
    right.push([at[0] - normal[0] * half, at[1] - normal[1] * half]);
    // Satin catches the light in bands where it bends; brightest just before a twist.
    const wave = 0.86 + 0.2 * Math.sin(t * Math.PI * 1.6 + band.phase);
    const gleam = band.twist === undefined ? 0 : Math.exp(-(((t - band.twist + 0.03) / 0.06) ** 2));
    const front = tone(body, sheen, 0.25 + gleam * 0.6, wave + gleam * 0.15);
    colors.push(back ? tone(shadow, body, 0.45, wave * 0.9) : front);
  }
  const ends = [
    {cut: band.start, ...cubicAt(curve, 0), inward: 1, corners: [left[0], right[0]]},
    {cut: band.end, ...cubicAt(curve, 1), inward: -1, corners: [left[steps], right[steps]]}
  ];
  const notches = ends.map(
    ({at, tangent, inward}): Point => [
      at[0] + tangent[0] * width * 0.62 * inward,
      at[1] + tangent[1] * width * 0.62 * inward
    ]
  );
  const outline = () => {
    c.beginPath();
    left.forEach(([px, py], i) => (i === 0 ? c.moveTo(px, py) : c.lineTo(px, py)));
    if (band.end === 'swallow') {
      c.lineTo(notches[1][0], notches[1][1]);
    }
    [...right].reverse().forEach(([px, py]) => c.lineTo(px, py));
    if (band.start === 'swallow') {
      c.lineTo(notches[0][0], notches[0][1]);
    }
    c.closePath();
  };

  // Its shadow on the paper, then the satin itself, slice by slice.
  c.save();
  outline();
  c.shadowColor = 'rgba(20, 8, 4, 0.38)';
  c.shadowBlur = r * 0.1;
  c.shadowOffsetX = r * 0.02;
  c.shadowOffsetY = r * 0.05;
  c.fillStyle = colors[0];
  c.fill();
  c.restore();
  c.save();
  outline();
  c.clip();
  for (let i = 0; i < steps; i++) {
    const across = c.createLinearGradient(left[i][0], left[i][1], right[i][0], right[i][1]);
    across.addColorStop(0, tone(shadow, shadow, 0, 1));
    across.addColorStop(0.1, colors[i]);
    across.addColorStop(0.55, colors[i]);
    across.addColorStop(0.9, colors[i]);
    across.addColorStop(1, tone(shadow, shadow, 0, 1));
    c.beginPath();
    c.moveTo(left[i][0], left[i][1]);
    c.lineTo(left[i + 1][0], left[i + 1][1]);
    c.lineTo(right[i + 1][0], right[i + 1][1]);
    c.lineTo(right[i][0], right[i][1]);
    c.closePath();
    c.fillStyle = across;
    c.strokeStyle = colors[i];
    c.lineWidth = 0.6;
    c.fill();
    c.stroke();
  }
  // The weave along its length, and the hems at both edges.
  const weave: [number, string, number][] = [
    [0.08, 'rgba(255, 255, 255, 0.16)', r * 0.012],
    [0.92, 'rgba(255, 255, 255, 0.1)', r * 0.012],
    [0.3, 'rgba(255, 255, 255, 0.05)', r * 0.008],
    [0.5, 'rgba(0, 0, 0, 0.06)', r * 0.008],
    [0.7, 'rgba(255, 255, 255, 0.05)', r * 0.008]
  ];
  for (const [share, colour, lineWidth] of weave) {
    c.beginPath();
    left.forEach(([lx, ly], i) => {
      const px = lx + (right[i][0] - lx) * share;
      const py = ly + (right[i][1] - ly) * share;
      if (i === 0) {
        c.moveTo(px, py);
      } else {
        c.lineTo(px, py);
      }
    });
    c.strokeStyle = colour;
    c.lineWidth = lineWidth;
    c.stroke();
  }
  c.restore();

  // A few loose threads where a swallowtail was cut.
  c.strokeStyle = tone(body, sheen, 0.3, 1);
  c.lineWidth = r * 0.008;
  for (const end of ends.filter(({cut}) => cut === 'swallow')) {
    const out: Point = [-end.tangent[0] * end.inward, -end.tangent[1] * end.inward];
    for (const corner of end.corners) {
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.moveTo(corner[0], corner[1]);
        c.lineTo(
          corner[0] + out[0] * r * (0.04 + k * 0.02) + (k - 1) * r * 0.012,
          corner[1] + out[1] * r * (0.04 + k * 0.02)
        );
        c.stroke();
      }
    }
  }
}

/** The silk under the seal, laid in the chosen way. */
function ribbon(c: CanvasRenderingContext2D, x: number, y: number, r: number, style: RibbonStyle, silk: string[]) {
  for (const band of RIBBONS[style]) {
    satinBand(c, x, y, r, band, silk);
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

/**
 * A shape pressed into the wax, raised from the field: its lower right in soft shadow, its upper
 * left catching the light (the light comes from the upper left), its face in the field's colour.
 */
function emboss(c: CanvasRenderingContext2D, palette: Palette, r: number, draw: () => void) {
  const passes: [string, number, number][] = [
    [palette.shade, 0.024, 0.03],
    [palette.light, -0.018, -0.022]
  ];
  for (const [color, dx, dy] of passes) {
    c.save();
    c.fillStyle = color;
    c.strokeStyle = color;
    c.shadowColor = color;
    c.shadowBlur = r * 0.025;
    c.translate(r * dx, r * dy);
    draw();
    c.restore();
  }
  c.save();
  c.fillStyle = palette.field[0];
  c.strokeStyle = palette.field[0];
  draw();
  c.restore();
}

/** A five-pointed star. */
function star(c: CanvasRenderingContext2D, x: number, y: number, outer: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : outer * 0.42;
    c.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  c.closePath();
  c.fill();
}

function crescent(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r * 0.13, Math.PI * 0.22, Math.PI * 1.78, false);
  c.arc(x + r * 0.055, y - r * 0.012, r * 0.102, Math.PI * 1.66, Math.PI * 0.34, true);
  c.closePath();
  c.fill();
  star(c, x - r * 0.25, y + r * 0.04, r * 0.045);
  star(c, x + r * 0.23, y - r * 0.05, r * 0.05);
  star(c, x + r * 0.31, y + r * 0.09, r * 0.032);
}

function rose(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // A heraldic rose: five outer petals, five inner ones turned between them, a seeded heart, and
  // a leaf on either side.
  for (const [count, distance, size, turn] of [
    [5, 0.075, 0.066, 0],
    [5, 0.04, 0.042, Math.PI / 5]
  ]) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + turn + (i * Math.PI * 2) / count;
      c.beginPath();
      c.arc(x + Math.cos(angle) * r * distance, y + Math.sin(angle) * r * distance, r * size, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.beginPath();
  c.arc(x, y, r * 0.026, 0, Math.PI * 2);
  c.fill();
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + side * r * 0.22, y + r * 0.05, r * 0.085, r * 0.03, side * 0.4, 0, Math.PI * 2);
    c.fill();
  }
}

function quill(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // A feather laid on the slant: the vane with its barbs, then the bare shaft to the nib.
  c.save();
  c.translate(x, y);
  c.rotate(-0.55);
  c.beginPath();
  c.moveTo(-r * 0.12, 0);
  c.bezierCurveTo(-r * 0.02, -r * 0.1, r * 0.2, -r * 0.1, r * 0.3, -r * 0.01);
  c.bezierCurveTo(r * 0.16, r * 0.065, -r * 0.02, r * 0.06, -r * 0.12, 0);
  c.fill();
  c.lineWidth = r * 0.014;
  c.beginPath();
  c.moveTo(-r * 0.34, r * 0.004);
  c.lineTo(r * 0.3, -r * 0.008);
  for (let i = 0; i < 6; i++) {
    const at = -r * 0.06 + i * r * 0.055;
    c.moveTo(at, -r * 0.004);
    c.lineTo(at + r * 0.05, -r * 0.06);
  }
  c.stroke();
  c.restore();
}

/** A ring of twisted cord inside the rim, as engraved round a seal matrix. */
function ropeBorder(c: CanvasRenderingContext2D, x: number, y: number, radius: number, r: number) {
  c.lineWidth = r * 0.012;
  c.beginPath();
  c.arc(x, y, radius + r * 0.035, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(x, y, radius - r * 0.035, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = r * 0.016;
  c.lineCap = 'round';
  c.beginPath();
  const twists = 48;
  for (let i = 0; i < twists; i++) {
    const angle = (i / twists) * Math.PI * 2;
    const inner = radius - r * 0.022;
    const outer = radius + r * 0.022;
    const lean = (Math.PI * 2) / twists / 2;
    c.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    c.lineTo(x + Math.cos(angle + lean) * outer, y + Math.sin(angle + lean) * outer);
  }
  c.stroke();
}

/** Draws the seal centred at (x, y) with radius r. */
export function drawSeal(c: CanvasRenderingContext2D, x: number, y: number, r: number, style: SealStyle) {
  const palette = SEAL_PALETTES[style.color];
  const next = random(style.seed);
  c.save();
  if (style.ribbon) {
    ribbon(c, x, y, r, style.ribbon, silkOf(style.silk, style.color));
  }

  // The wax, with its shadow on the paper and a few drops that ran off.
  c.save();
  c.shadowColor = 'rgba(30, 10, 4, 0.5)';
  c.shadowBlur = r * 0.22;
  c.shadowOffsetX = r * 0.03;
  c.shadowOffsetY = r * 0.08;
  pool(c, x, y, r, style.seed);
  c.fillStyle = waxGradient(c, x, y, r, palette);
  c.fill();
  c.restore();
  drops(c, x, y, r, palette, next);

  c.save();
  pool(c, x, y, r, style.seed);
  c.clip();
  // The pool's rounded edge: darker as it falls to the paper.
  const bevel = c.createRadialGradient(x, y, r * 0.78, x, y, r * 1.08);
  bevel.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bevel.addColorStop(1, palette.shade);
  c.fillStyle = bevel;
  c.globalAlpha = 0.55;
  c.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
  // Wax is never one colour: soft mottling where it cooled unevenly.
  for (let i = 0; i < 9; i++) {
    const angle = next() * Math.PI * 2;
    const distance = Math.sqrt(next()) * r * 0.9;
    const mx = x + Math.cos(angle) * distance;
    const my = y + Math.sin(angle) * distance;
    const spread = r * (0.15 + next() * 0.25);
    const mottle = c.createRadialGradient(mx, my, 0, mx, my, spread);
    mottle.addColorStop(0, next() > 0.5 ? palette.light : palette.shade);
    mottle.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.globalAlpha = 0.12;
    c.fillStyle = mottle;
    c.fillRect(mx - spread, my - spread, spread * 2, spread * 2);
  }
  c.globalAlpha = 1;
  // Flow lines in the skin of the wax, between the lip and the edge.
  c.lineWidth = r * 0.01;
  c.strokeStyle = palette.light;
  for (let i = 0; i < 3; i++) {
    const radius = r * (0.88 + i * 0.045);
    const from = Math.PI * (0.95 + next() * 0.2);
    c.globalAlpha = 0.35 - i * 0.08;
    c.beginPath();
    c.arc(x + (next() - 0.5) * r * 0.03, y + (next() - 0.5) * r * 0.03, radius, from, from + Math.PI * 0.45);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();

  // The lip: wax pushed up round the matrix, lit on its upper left, shaded on its lower right.
  c.save();
  pool(c, x, y, r * 0.92, style.seed);
  c.lineWidth = r * 0.12;
  const lip = c.createLinearGradient(x - r, y - r, x + r, y + r);
  lip.addColorStop(0, palette.light);
  lip.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
  lip.addColorStop(1, palette.shade);
  c.strokeStyle = lip;
  c.stroke();
  c.restore();

  // The pressed field, sunk below the lip: in the lip's shadow on its upper left, catching light on
  // its lower right, as a hollow does.
  const fieldRadius = r * 0.72;
  c.beginPath();
  c.arc(x, y, fieldRadius, 0, Math.PI * 2);
  const field = c.createRadialGradient(x + r * 0.2, y + r * 0.24, r * 0.05, x, y, r * 0.78);
  field.addColorStop(0, palette.field[0]);
  field.addColorStop(1, palette.field[1]);
  c.fillStyle = field;
  c.fill();
  const hollow = c.createLinearGradient(x - fieldRadius, y - fieldRadius, x + fieldRadius, y + fieldRadius);
  hollow.addColorStop(0, palette.shade);
  hollow.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
  hollow.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
  hollow.addColorStop(1, palette.light);
  c.fillStyle = hollow;
  c.globalAlpha = 0.38;
  c.fill();
  c.globalAlpha = 1;
  // Its wall: in shadow above (the light comes from the upper left), lit below.
  c.lineWidth = r * 0.045;
  c.strokeStyle = palette.shade;
  c.beginPath();
  c.arc(x, y, fieldRadius, Math.PI * 0.9, Math.PI * 1.85);
  c.stroke();
  c.strokeStyle = palette.light;
  c.lineWidth = r * 0.028;
  c.beginPath();
  c.arc(x, y, fieldRadius, Math.PI * 1.95, Math.PI * 0.8);
  c.stroke();

  // The engraving: a twisted cord round the field, the monogram, the emblem above it.
  emboss(c, palette, r * 0.7, () => ropeBorder(c, x, y, r * 0.62, r));
  const letters = Array.from(style.monogram);
  const size = Math.round(r * (letters.length > 1 ? 0.58 : 0.8) * (style.emblem === 'none' ? 1.08 : 1));
  const baseline = y + (style.emblem === 'none' ? r * 0.04 : r * 0.14);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 ${size}px ${style.display}`;
  emboss(c, palette, r, () => c.fillText(style.monogram, x, baseline));
  const emblemY = y - r * 0.36;
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
  for (let i = 0; i < 60; i++) {
    const angle = next() * Math.PI * 2;
    const distance = Math.sqrt(next()) * r;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    c.beginPath();
    c.arc(px, py, r * (0.005 + next() * 0.011), 0, Math.PI * 2);
    c.fillStyle = next() > 0.5 ? palette.shade : palette.light;
    c.globalAlpha = 0.32;
    c.fill();
  }
  c.globalAlpha = 1;

  // Highlights on the glossy wax: a broad soft sheen, a sharp glint along the lip, a few sparks.
  const sheen = c.createRadialGradient(x - r * 0.45, y - r * 0.5, 0, x - r * 0.45, y - r * 0.5, r * 0.55);
  sheen.addColorStop(0, 'rgba(255, 244, 236, 0.3)');
  sheen.addColorStop(1, 'rgba(255, 244, 236, 0)');
  c.fillStyle = sheen;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x, y, r * 0.86, Math.PI * 1.06, Math.PI * 1.4);
  c.lineWidth = r * 0.03;
  c.strokeStyle = 'rgba(255, 250, 244, 0.55)';
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.66, Math.PI * 0.12, Math.PI * 0.32);
  c.lineWidth = r * 0.018;
  c.strokeStyle = 'rgba(255, 250, 244, 0.35)';
  c.stroke();
  for (const [sx, sy, sr] of [
    [-0.58, -0.56, 0.035],
    [0.62, 0.5, 0.022],
    [-0.2, -0.82, 0.018]
  ]) {
    c.beginPath();
    c.arc(x + sx * r, y + sy * r, sr * r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255, 252, 248, 0.7)';
    c.fill();
  }
  c.restore();
  c.restore();
}
