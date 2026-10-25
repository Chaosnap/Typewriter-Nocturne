// Draws a folio on a canvas: the text set like a page of verse on laid paper, every fourth line
// numbered in the margin, titled and dated, signed, and sealed in red wax. The same drawing serves
// the Press on screen (with the printing animation) and the PNG a folio can be saved as.

import {folioDate, folioSourceName, toRoman, verseLines} from '../../../app/nocturne/folio';
import type {FolioDraft} from '../../../app/nocturne/folio';

import {drawSeal} from './seal';

export const FOLIO_WIDTH = 720;
const MIN_HEIGHT = 640;
const MARGIN = 74;
const GUTTER = 40;
const LINE = 21;
const STANZA_GAP = 12;
const SEAL_RADIUS = 46;

const INK = '#2a2019';
const MUTED = '#8a7a66';
const RUBRIC = '#8e2a1c';
const PAPER = '#f4ecdc';

export type FolioArt = {
  draft: FolioDraft;
  /** The sonnet number in the Archive, or null for a folio that is not kept. */
  number: number | null;
  createdAt: string;
  /** How much of the text has been typed, 0–1 (the printing animation). */
  progress: number;
  /** The seal being lowered and pressed, 0–1. */
  seal: number;
  fonts: {serif: string; display: string; mono: string};
  pixelRatio: number;
};

type Row = {text: string; number: number | null; gapBefore: number};

/** Wraps long lines with a hanging indent, keeping each line's verse number on its first row. */
function rows(draft: FolioDraft, columns: number): Row[] {
  const result: Row[] = [];
  let gap = 0;
  for (const line of verseLines(draft.text)) {
    if (line.stanzaBreak) {
      gap = STANZA_GAP;
      continue;
    }
    const indent = line.text.match(/^ */)?.[0].length ?? 0;
    const hanging = ' '.repeat(Math.min(indent + 2, Math.floor(columns / 2)));
    let rest = line.text;
    let first = true;
    while (first || rest.length > 0) {
      const width = first ? columns : columns - hanging.length;
      const piece = rest.slice(0, width);
      rest = rest.slice(width);
      result.push({text: first ? piece : hanging + piece, number: first ? line.number : null, gapBefore: gap});
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

function paper(c: CanvasRenderingContext2D, width: number, height: number) {
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
  c.fillStyle = PAPER;
  c.fill();
  c.restore();
  c.save();
  c.clip();
  // Laid lines across the sheet, chain lines down it.
  c.fillStyle = 'rgba(90, 70, 40, 0.035)';
  for (let y = 0; y < height; y += 4) {
    c.fillRect(0, y, width, 1);
  }
  c.fillStyle = 'rgba(90, 70, 40, 0.05)';
  for (let x = 48; x < width; x += 96) {
    c.fillRect(x, 0, 1.5, height);
  }
  // Warm edges, as a sheet darkens with age and handling.
  const vignette = c.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.75);
  vignette.addColorStop(0, 'rgba(120, 80, 30, 0)');
  vignette.addColorStop(1, 'rgba(120, 80, 30, 0.12)');
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
  measure.font = `13.5px ${art.fonts.mono}`;
  const charWidth = measure.measureText('M').width || 8;
  const columns = Math.max(20, Math.floor((FOLIO_WIDTH - 2 * MARGIN - GUTTER) / charWidth));
  const body = rows(art.draft, columns);
  measure.font = `italic 30px ${art.fonts.display}`;
  const titleLines = wrapTitle(measure, art.draft.title || 'Untitled', FOLIO_WIDTH - 2 * MARGIN);
  // Heading block: number, title lines, provenance, fleuron; the verse starts below it.
  const bodyTop = 178 + titleLines.length * 36;
  const bodyHeight = body.reduce((sum, row) => sum + LINE + row.gapBefore, 0);
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
  paper(c, FOLIO_WIDTH, height);
  const centre = FOLIO_WIDTH / 2;

  // Heading: the sonnet's number in spaced capitals, the title, the provenance and a fleuron.
  c.textBaseline = 'alphabetic';
  c.fillStyle = RUBRIC;
  c.font = `600 12px ${art.fonts.serif}`;
  const heading = art.number ? `SONNET  ${toRoman(art.number)}` : 'A  SONNET  IN  CODE';
  spacedCaps(c, heading, centre, 78, 3.2);
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.font = `italic 30px ${art.fonts.display}`;
  titleLines.forEach((line, i) => c.fillText(line, centre, 118 + i * 36));
  const subtitleY = 118 + (titleLines.length - 1) * 36 + 30;
  c.fillStyle = MUTED;
  c.font = `italic 14px ${art.fonts.serif}`;
  c.fillText(`printed from ${folioSourceName(art.draft.source)} · ${folioDate(art.createdAt)}`, centre, subtitleY);
  const ornamentY = subtitleY + 22;
  c.fillStyle = 'rgba(138, 122, 102, 0.6)';
  c.fillRect(centre - 92, ornamentY - 4, 70, 0.8);
  c.fillRect(centre + 22, ornamentY - 4, 70, 0.8);
  c.font = `15px ${art.fonts.serif}`;
  c.fillStyle = RUBRIC;
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
    c.fillStyle = INK;
    c.font = `13.5px ${art.fonts.mono}`;
    c.fillText(shown, MARGIN, y);
    if (row.number !== null && shown.length === row.text.length) {
      c.textAlign = 'right';
      c.fillStyle = MUTED;
      c.font = `italic 12px ${art.fonts.serif}`;
      c.fillText(String(row.number), FOLIO_WIDTH - MARGIN + 4, y);
    }
    if (budget < 0) {
      caret = {x: MARGIN + shown.length * charWidth, y};
    }
    y += LINE;
  }
  if (caret) {
    c.fillStyle = 'rgba(42, 32, 25, 0.75)';
    c.fillRect(caret.x + 1, caret.y - 12, charWidth, 15);
  }

  // Colophon and seal.
  if (art.progress >= 1) {
    c.textAlign = 'left';
    c.fillStyle = MUTED;
    c.font = `italic 14px ${art.fonts.serif}`;
    c.fillText('— set at the typewriter, by lamplight', MARGIN, height - 92);
  }
  if (art.seal > 0) {
    const t = Math.min(1, art.seal);
    const lowered = 1 - Math.pow(1 - t, 3);
    const scale = 1 + (1 - lowered) * 0.6;
    c.save();
    c.globalAlpha = Math.min(1, t * 2);
    const x = FOLIO_WIDTH - MARGIN - SEAL_RADIUS + 6;
    const sealY = height - 116;
    c.translate(x, sealY);
    c.scale(scale, scale);
    drawSeal(c, 0, 0, SEAL_RADIUS, {seed: (art.number ?? 7) * 1.37, monogram: 'N', display: art.fonts.display});
    c.restore();
  }
  return height;
}
