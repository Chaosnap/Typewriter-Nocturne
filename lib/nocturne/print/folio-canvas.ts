// Draws a folio on a canvas: the text set like a page of verse on the chosen paper, every fourth
// line numbered in the margin, titled and dated, signed, and sealed in wax. The same drawing serves
// the Press on screen (with the printing animation) and the PNG a folio can be saved as.

import {folioDate, folioSourceName, toRoman, verseLines} from '../../../app/nocturne/folio';
import type {FolioDraft} from '../../../app/nocturne/folio';
import type {FolioPaperId} from '../../../app/nocturne/types';

import {drawSeal} from './seal';

export const FOLIO_WIDTH = 720;
const MIN_HEIGHT = 640;
const MARGIN = 74;
const GUTTER = 40;
const STANZA_GAP = 12;
const SEAL_RADIUS = 46;

type Sheet = {
  ground: string;
  ink: string;
  muted: string;
  rubric: string;
  /** Faint lines and fibres in the paper. */
  grain: string;
  /** Darkening towards the edges. */
  edge: string;
  laid: boolean;
  fibres: number;
  stains: number;
};

export const FOLIO_PAPERS: Record<FolioPaperId, Sheet> = {
  laid: {
    ground: '#f4ecdc',
    ink: '#2a2019',
    muted: '#8a7a66',
    rubric: '#8e2a1c',
    grain: 'rgba(90, 70, 40, 0.04)',
    edge: 'rgba(120, 80, 30, 0.12)',
    laid: true,
    fibres: 0,
    stains: 0
  },
  cotton: {
    ground: '#f8f5ee',
    ink: '#23201c',
    muted: '#857c70',
    rubric: '#8c2b22',
    grain: 'rgba(110, 96, 80, 0.07)',
    edge: 'rgba(110, 90, 60, 0.07)',
    laid: false,
    fibres: 260,
    stains: 0
  },
  vellum: {
    ground: '#f0e4c6',
    ink: '#2b2117',
    muted: '#8b7653',
    rubric: '#7f2a16',
    grain: 'rgba(150, 110, 50, 0.05)',
    edge: 'rgba(140, 96, 34, 0.14)',
    laid: false,
    fibres: 60,
    stains: 5
  },
  parchment: {
    ground: '#e8d4a6',
    ink: '#30210f',
    muted: '#7d6340',
    rubric: '#7c2410',
    grain: 'rgba(120, 80, 30, 0.07)',
    edge: 'rgba(110, 60, 10, 0.3)',
    laid: false,
    fibres: 120,
    stains: 14
  },
  night: {
    ground: '#1d2030',
    ink: '#ece4cf',
    muted: '#a29a86',
    rubric: '#d9ad62',
    grain: 'rgba(220, 210, 255, 0.035)',
    edge: 'rgba(0, 0, 0, 0.35)',
    laid: true,
    fibres: 0,
    stains: 0
  }
};

export type FolioArt = {
  draft: FolioDraft;
  /** The sonnet number in the Archive, or null for a folio that is not kept. */
  number: number | null;
  createdAt: string;
  /** How much of the text has been typed, 0–1 (the printing animation). */
  progress: number;
  /** The seal being lowered and pressed, 0–1. */
  seal: number;
  /** `text` is the face of the verse, at `textSize` pixels. */
  fonts: {serif: string; display: string; text: string; textSize: number};
  pixelRatio: number;
};

type Row = {text: string; number: number | null; gapBefore: number};

/** Character widths in the text face, measured once each. */
function widthOf(c: CanvasRenderingContext2D) {
  const cache = new Map<string, number>();
  return (text: string) => {
    let width = 0;
    for (const char of text) {
      let w = cache.get(char);
      if (w === undefined) {
        w = c.measureText(char).width;
        cache.set(char, w);
      }
      width += w;
    }
    return width;
  };
}

/** Wraps long lines with a hanging indent, keeping each line's verse number on its first row. */
function rows(draft: FolioDraft, width: number, measure: (text: string) => number): Row[] {
  const result: Row[] = [];
  let gap = 0;
  for (const line of verseLines(draft.text)) {
    if (line.stanzaBreak) {
      gap = STANZA_GAP;
      continue;
    }
    const indent = line.text.match(/^ */)?.[0].length ?? 0;
    const hanging = ' '.repeat(Math.min(indent + 2, 24));
    let rest = Array.from(line.text);
    let first = true;
    while (first || rest.length > 0) {
      const lead = first ? '' : hanging;
      let used = measure(lead);
      let count = 0;
      while (count < rest.length && (count === 0 || used + measure(rest[count]) <= width)) {
        used += measure(rest[count]);
        count += 1;
      }
      const piece = rest.slice(0, count).join('');
      rest = rest.slice(count);
      result.push({text: lead + piece, number: first ? line.number : null, gapBefore: gap});
      gap = 0;
      first = false;
    }
  }
  return result;
}

function wrapTitle(c: CanvasRenderingContext2D, title: string, width: number): string[] {
  const words = title.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (c.measureText(candidate).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.slice(0, 2);
}

/** Small capitals with letter spacing, laid out by hand and centred. */
function spacedCaps(c: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const letters = Array.from(text);
  const widths = letters.map((letter) => c.measureText(letter).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (letters.length - 1);
  let cursor = x - total / 2;
  c.textAlign = 'left';
  letters.forEach((letter, i) => {
    c.fillText(letter, cursor, y);
    cursor += widths[i] + spacing;
  });
}

/** A small deterministic random generator, so a paper's fibres are the same on every draw. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function paper(c: CanvasRenderingContext2D, width: number, height: number, sheet: Sheet, seed: number) {
  // A sheet with deckled edges on a transparent ground.
  c.beginPath();
  const inset = 6;
  const edge = (t: number) => Math.sin(t * 0.9) * 0.8 + Math.sin(t * 2.3) * 0.5;
  c.moveTo(inset, inset);
  for (let x = inset; x <= width - inset; x += 6) {
    c.lineTo(x, inset + edge(x));
  }
  for (let y = inset; y <= height - inset; y += 6) {
    c.lineTo(width - inset + edge(y + 50), y);
  }
  for (let x = width - inset; x >= inset; x -= 6) {
    c.lineTo(x, height - inset + edge(x + 100));
  }
  for (let y = height - inset; y >= inset; y -= 6) {
    c.lineTo(inset + edge(y + 150), y);
  }
  c.closePath();
  c.save();
  c.shadowColor = 'rgba(30, 18, 8, 0.35)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 3;
  c.fillStyle = sheet.ground;
  c.fill();
  c.restore();
  c.save();
  c.clip();
  const next = random(seed);
  if (sheet.laid) {
    // Laid lines across the sheet, chain lines down it.
    c.fillStyle = sheet.grain;
    for (let y = 0; y < height; y += 4) {
      c.fillRect(0, y, width, 1);
    }
    for (let x = 48; x < width; x += 96) {
      c.fillRect(x, 0, 1.5, height);
    }
  }
  // Soft stains, as on a skin or an old sheet.
  for (let i = 0; i < sheet.stains; i++) {
    const x = next() * width;
    const y = next() * height;
    const radius = 30 + next() * 90;
    const stain = c.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, sheet.grain);
    stain.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = stain;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Short fibres in the pulp.
  c.strokeStyle = sheet.grain;
  c.lineWidth = 0.7;
  for (let i = 0; i < sheet.fibres; i++) {
    const x = next() * width;
    const y = next() * height;
    const angle = next() * Math.PI;
    const length = 3 + next() * 9;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + length * 0.5, y + 2, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    c.stroke();
  }
  // Warm edges, as a sheet darkens with age and handling.
  const vignette = c.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, sheet.edge);
  c.fillStyle = vignette;
  c.fillRect(0, 0, width, height);
  c.restore();
}

/** Lays out and draws the folio; returns its height in CSS pixels. */
export function drawFolio(canvas: HTMLCanvasElement, art: FolioArt): number {
  const measure = canvas.getContext('2d');
  if (!measure) {
    return MIN_HEIGHT;
  }
  const {style} = art.draft;
  const sheet = FOLIO_PAPERS[style.paper];
  const textFont = `${art.fonts.textSize}px ${art.fonts.text}`;
  const line = Math.round(art.fonts.textSize * 1.55);
  measure.font = textFont;
  const width = widthOf(measure);
  const body = rows(art.draft, FOLIO_WIDTH - 2 * MARGIN - GUTTER, width);
  measure.font = `italic 30px ${art.fonts.display}`;
  const titleLines = wrapTitle(measure, art.draft.title || 'Untitled', FOLIO_WIDTH - 2 * MARGIN);
  // Heading block: number, title lines, provenance, fleuron; the verse starts below it.
  const bodyTop = 178 + titleLines.length * 36;
  const bodyHeight = body.reduce((sum, row) => sum + line + row.gapBefore, 0);
  const height = Math.max(MIN_HEIGHT, Math.ceil(bodyTop + bodyHeight + 190));

  const ratio = art.pixelRatio;
  canvas.width = Math.round(FOLIO_WIDTH * ratio);
  canvas.height = Math.round(height * ratio);
  const c = canvas.getContext('2d');
  if (!c) {
    return height;
  }
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.clearRect(0, 0, FOLIO_WIDTH, height);
  paper(c, FOLIO_WIDTH, height, sheet, (art.number ?? 7) * 7919);
  const centre = FOLIO_WIDTH / 2;

  // Heading: the sonnet's number in spaced capitals, the title, the provenance and a fleuron.
  c.textBaseline = 'alphabetic';
  c.fillStyle = sheet.rubric;
  c.font = `600 12px ${art.fonts.serif}`;
  const heading = art.number ? `SONNET  ${toRoman(art.number)}` : 'A  SONNET  IN  CODE';
  spacedCaps(c, heading, centre, 78, 3.2);
  c.fillStyle = sheet.ink;
  c.textAlign = 'center';
  c.font = `italic 30px ${art.fonts.display}`;
  titleLines.forEach((title, i) => c.fillText(title, centre, 118 + i * 36));
  const subtitleY = 118 + (titleLines.length - 1) * 36 + 30;
  c.fillStyle = sheet.muted;
  c.font = `italic 14px ${art.fonts.serif}`;
  c.fillText(`printed from ${folioSourceName(art.draft.source)} · ${folioDate(art.createdAt)}`, centre, subtitleY);
  const ornamentY = subtitleY + 22;
  c.globalAlpha = 0.6;
  c.fillRect(centre - 92, ornamentY - 4, 70, 0.8);
  c.fillRect(centre + 22, ornamentY - 4, 70, 0.8);
  c.globalAlpha = 1;
  c.font = `15px ${art.fonts.serif}`;
  c.fillStyle = sheet.rubric;
  c.fillText('❦', centre, ornamentY);

  // The verse, typed up to `progress`.
  const total = body.reduce((sum, row) => sum + row.text.length, 0);
  let budget = Math.round(total * Math.min(1, Math.max(0, art.progress)));
  let y = bodyTop;
  let caret: {x: number; y: number} | null = null;
  for (const row of body) {
    y += row.gapBefore;
    if (budget <= 0) {
      break;
    }
    const shown = row.text.slice(0, budget);
    budget -= row.text.length;
    c.textAlign = 'left';
    c.fillStyle = sheet.ink;
    c.font = textFont;
    c.fillText(shown, MARGIN, y);
    if (row.number !== null && shown.length === row.text.length) {
      c.textAlign = 'right';
      c.fillStyle = sheet.muted;
      c.font = `italic 12px ${art.fonts.serif}`;
      c.fillText(String(row.number), FOLIO_WIDTH - MARGIN + 4, y);
    }
    if (budget < 0) {
      caret = {x: MARGIN + width(shown), y};
    }
    y += line;
  }
  if (caret) {
    const size = art.fonts.textSize;
    c.globalAlpha = 0.75;
    c.fillStyle = sheet.ink;
    c.fillRect(caret.x + 1, caret.y - size * 0.85, size * 0.6, size * 1.1);
    c.globalAlpha = 1;
  }

  // Colophon and seal.
  if (art.progress >= 1) {
    c.textAlign = 'left';
    c.fillStyle = sheet.muted;
    c.font = `italic 14px ${art.fonts.serif}`;
    c.fillText(`— set at the typewriter, by ${style.signature || 'lamplight'}`, MARGIN, height - 92);
  }
  if (art.seal > 0 && style.seal) {
    const t = Math.min(1, art.seal);
    const lowered = 1 - Math.pow(1 - t, 3);
    const scale = 1 + (1 - lowered) * 0.6;
    c.save();
    c.globalAlpha = Math.min(1, t * 2);
    const x = FOLIO_WIDTH - MARGIN - SEAL_RADIUS + 6;
    const sealY = height - 116;
    c.translate(x, sealY);
    c.scale(scale, scale);
    drawSeal(c, 0, 0, SEAL_RADIUS, {
      seed: (art.number ?? 7) * 1.37,
      monogram: style.monogram,
      color: style.sealColor,
      emblem: style.emblem,
      ribbon: style.ribbon ? style.ribbonStyle : null,
      silk: style.ribbonColor,
      display: art.fonts.display
    });
    c.restore();
  }
  return height;
}
