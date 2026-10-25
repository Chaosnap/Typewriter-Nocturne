// In-process event bus for the Nocturne layer. Everything published here is derived from what
// the terminal has already rendered (cursor geometry, echoed characters) or from passive key
// listeners. Nothing on this bus can reach the PTY.

export type CursorFrame = {
  uid: string;
  /** Cursor cell in client (viewport) coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** Full-screen program (alternate screen buffer: vim, less, tmux, htop…). */
  alternate: boolean;
  /** Whether the cursor row is inside the visible viewport (false while scrolled back). */
  visible: boolean;
  /** Buffer line shown in the top row of the viewport. */
  viewportY: number;
  /** Buffer line of the top row when scrolled to the bottom: 0 means there is no scrollback. */
  baseY: number;
  /** The program has hidden the cursor (DECTCEM, `ESC[?25l`), as full-screen programs often do. */
  cursorHidden: boolean;
  /** The terminal has keyboard focus. */
  focused: boolean;
  /** The character under the cursor, for a cursor Nocturne draws itself (a space on an empty cell). */
  glyph: {char: string; width: number; bold: boolean; italic: boolean};
  /** The text grid (`.xterm-screen`) in client coordinates. */
  grid: {left: number; top: number; width: number; height: number};
};

export type StrikeEvent = {
  uid: string;
  char: string;
  /** Cell of the glyph: column, and absolute buffer line (so it can follow scrolling). */
  col: number;
  line: number;
  cellWidth: number;
  /** Width of the glyph (two cells for wide characters). */
  width: number;
  /** Foreground: null = default ink, a number = palette index, a string = `#rrggbb`. */
  fg: number | string | null;
  bold: boolean;
};

/**
 * What kind of key was struck. `up`/`down` recall shell history, `left`/`right` move the cursor.
 * `compose` is a keystroke inside an IME composition (pinyin, kana, hangul…), `select` changes the
 * composition without typing (choosing a candidate), `commit` hands the composed text to the shell.
 */
export type KeyKind =
  | 'key'
  | 'space'
  | 'return'
  | 'backspace'
  | 'tab'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'compose'
  | 'select'
  | 'commit';

/** One selected cell, for the ink selection effect. */
export type SelectedCell = {
  /** Absolute buffer line and column. */
  line: number;
  col: number;
  char: string;
  /** Cells the glyph covers (2 for wide characters). */
  width: number;
  fg: number | string | null;
  bold: boolean;
};

/** Sounds of the room rather than of the keys. */
export type CueKind = 'cord' | 'seal' | 'print' | 'line';

type EventMap = {
  /** Cursor geometry of the active terminal changed. */
  cursor: CursorFrame;
  /** A typed character was echoed by the program at this cell (never fired for hidden input). */
  strike: StrikeEvent;
  /** The user pressed a key in a terminal (passive observation). */
  key: {kind: KeyKind; repeat: boolean};
  /** The cursor crossed the right-margin bell column while typing. */
  marginBell: {uid: string};
  /** The lamp cord was pulled, a folio printed or sealed. */
  cue: {kind: CueKind};
  /** The selection of the active terminal changed; no cells when it was cleared. */
  selection: {uid: string; cells: SelectedCell[]};
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const handlers: {[K in keyof EventMap]: Set<Handler<K>>} = {
  cursor: new Set(),
  strike: new Set(),
  key: new Set(),
  marginBell: new Set(),
  cue: new Set(),
  selection: new Set()
};

let lastCursor: CursorFrame | null = null;

export function on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
  const set = handlers[event];
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

export function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
  if (event === 'cursor') {
    lastCursor = payload as CursorFrame;
  }
  handlers[event].forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.error(`Nocturne ${event} handler failed`, error);
    }
  });
}

/** The most recent cursor frame of the active terminal, if any. */
export const getLastCursor = () => lastCursor;
