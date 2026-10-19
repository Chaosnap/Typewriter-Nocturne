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

export type KeyKind = 'key' | 'space' | 'return' | 'backspace' | 'composition';

type EventMap = {
  /** Cursor geometry of the active terminal changed. */
  cursor: CursorFrame;
  /** A typed character was echoed by the program at this cell (never fired for hidden input). */
  strike: StrikeEvent;
  /** The user pressed a key in a terminal (passive observation). */
  key: {kind: KeyKind; repeat: boolean};
  /** The cursor crossed the right-margin bell column while typing. */
  marginBell: {uid: string};
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const handlers: {[K in keyof EventMap]: Set<Handler<K>>} = {
  cursor: new Set(),
  strike: new Set(),
  key: new Set(),
  marginBell: new Set()
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
