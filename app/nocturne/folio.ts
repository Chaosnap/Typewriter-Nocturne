// A folio: a code snippet or a piece of terminal output, printed like a page of verse and sealed
// in wax. Shared by the main process (Archive storage) and the renderer (the Press).
//
// Everything that arrives from outside (a renderer message, a file in the Archive) goes through
// sanitizeFolio(), which keeps only plain text of bounded size. A folio is never executed or
// interpreted; it is only drawn.

import {defaultFolioStyle, sanitizeFolioStyle} from './settings';
import type {FolioStyle} from './types';

/** `command`: the last command run in the terminal, with its output. */
export type FolioSource = 'snippet' | 'selection' | 'screen' | 'command';

export type FolioDraft = {
  title: string;
  text: string;
  source: FolioSource;
  /** How it is printed; kept with the folio so it looks the same when reopened. */
  style: FolioStyle;
};

export type Folio = FolioDraft & {
  /** Assigned by the Archive when the folio is kept. */
  id: string;
  /** The sonnet number in the Archive, from 1. */
  number: number;
  /** ISO 8601. */
  createdAt: string;
};

export const FOLIO_LIMITS = {title: 120, text: 64000, lines: 400, lineLength: 240};

const SOURCES: FolioSource[] = ['snippet', 'selection', 'screen', 'command'];

const isDict = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Removes control characters (the escape of escape sequences included) except tabs and line breaks.
 * Private-use characters stay: they are the icons of Nerd Fonts.
 */
const plainText = (value: string) => value.replace(/\r\n?/g, '\n').replace(/[^\P{Cc}\t\n]/gu, '');

/** A title on one line, of bounded length. */
export const sanitizeTitle = (raw: unknown) =>
  typeof raw === 'string' ? plainText(raw).replace(/\s+/g, ' ').trim().slice(0, FOLIO_LIMITS.title) : '';

export function sanitizeDraft(raw: unknown): FolioDraft | null {
  if (!isDict(raw) || typeof raw.text !== 'string') {
    return null;
  }
  const text = plainText(raw.text).slice(0, FOLIO_LIMITS.text);
  if (!text.trim()) {
    return null;
  }
  const source = SOURCES.find((item) => item === raw.source) ?? 'snippet';
  // Folios printed before there were print options have none: they get the defaults.
  const style = sanitizeFolioStyle(raw.style, defaultFolioStyle());
  return {title: sanitizeTitle(raw.title), text, source, style};
}

export const isFolioId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9]{6,14}-[0-9a-f]{8}$/.test(value);

/** A stored folio, or null when the record is malformed. */
export function sanitizeFolio(raw: unknown): Folio | null {
  const draft = sanitizeDraft(raw);
  if (!draft || !isDict(raw) || !isFolioId(raw.id)) {
    return null;
  }
  const number = typeof raw.number === 'number' && Number.isInteger(raw.number) && raw.number > 0 ? raw.number : 1;
  const created = typeof raw.createdAt === 'string' ? new Date(raw.createdAt) : new Date(NaN);
  if (Number.isNaN(created.getTime())) {
    return null;
  }
  return {...draft, id: raw.id, number, createdAt: created.toISOString()};
}

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
];

export function toRoman(value: number): string {
  let rest = Math.max(1, Math.min(3999, Math.floor(value)));
  let result = '';
  for (const [amount, letters] of ROMAN) {
    while (rest >= amount) {
      result += letters;
      rest -= amount;
    }
  }
  return result;
}

export type VerseLine = {
  text: string;
  /** Shown in the margin every fourth line of verse, as editions of sonnets number their lines. */
  number: number | null;
  /** A blank line: the break between two stanzas. */
  stanzaBreak: boolean;
};

/** Lays the text out as verse: tabs expanded, trailing space trimmed, every fourth line numbered. */
export function verseLines(text: string): VerseLine[] {
  const raw: string[] = [];
  for (const line of text.split('\n')) {
    raw.push(line.replace(/\t/g, '    ').replace(/\s+$/, '').slice(0, FOLIO_LIMITS.lineLength));
  }
  while (raw.length > 0 && raw[0] === '') {
    raw.shift();
  }
  while (raw.length > 0 && raw[raw.length - 1] === '') {
    raw.pop();
  }
  const lines: VerseLine[] = [];
  let count = 0;
  for (const line of raw.slice(0, FOLIO_LIMITS.lines)) {
    if (line === '') {
      if (lines.length > 0 && !lines[lines.length - 1].stanzaBreak) {
        lines.push({text: '', number: null, stanzaBreak: true});
      }
      continue;
    }
    count += 1;
    lines.push({text: line, number: count % 4 === 0 ? count : null, stanzaBreak: false});
  }
  return lines;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function ordinal(day: number) {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) {
    return `${day}th`;
  }
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
  return `${day}${suffix}`;
}

/** "the 25th of October, 2026" */
export function folioDate(iso: string): string {
  const date = new Date(iso);
  return `the ${ordinal(date.getDate())} of ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

const SOURCE_NAMES: Record<FolioSource, string> = {
  snippet: 'a snippet',
  selection: 'the terminal',
  screen: 'the terminal',
  command: 'the last command'
};

export const folioSourceName = (source: FolioSource) => SOURCE_NAMES[source];
