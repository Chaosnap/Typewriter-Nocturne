// Read-only bridge between one xterm.js Terminal and the Nocturne layer.
//
// It reads cursor geometry after xterm has rendered and publishes it on the bus, applies the two
// xterm options Hyper does not expose (cursor width, minimum contrast ratio), and detects echoed
// keystrokes for the afterimage / ink-bloom effects. It never writes to the terminal, never
// subscribes to PTY data and never delays input.

import type {IBufferCell, IDisposable, IMarker, Terminal} from 'xterm';

import {extraTerminalOptions} from '../../app/nocturne/apply-config';

import {emit, on} from './bus';
import type {SelectedCell} from './bus';
import {getSettings, subscribe} from './store';

let activeUid: string | null = null;
const terminals = new Map<string, Terminal>();
/** Where each of the last few commands was entered: markers follow their lines as the buffer scrolls. */
const commandMarks = new Map<string, IMarker[]>();

/** The ink selection effect animates at most this many cells; a larger selection just gets the wash. */
const MAX_SELECTED_CELLS = 4000;
/** Commands remembered per terminal for the Press (Enter on an empty prompt counts, so a few). */
const MAX_COMMAND_MARKS = 8;

/** Characters the user typed, waiting to be confirmed by the program's echo at this cell. */
type Expected = {chars: string[]; col: number; row: number; at: number};

/** Echo of a keystroke arrives within a few frames; composed text can take a little longer. */
const ECHO_WINDOW_MS = 600;

const PRINTABLE = /^[^\p{C}]$/u;

function foregroundOf(cell: IBufferCell): number | string | null {
  if (cell.isFgRGB()) {
    return `#${cell.getFgColor().toString(16).padStart(6, '0')}`;
  }
  return cell.isFgPalette() ? cell.getFgColor() : null;
}

function applyExtraOptions(term: Terminal) {
  const options = extraTerminalOptions(getSettings());
  if (term.options.cursorWidth !== options.cursorWidth) {
    term.options.cursorWidth = options.cursorWidth;
  }
  if (term.options.minimumContrastRatio !== options.minimumContrastRatio) {
    term.options.minimumContrastRatio = options.minimumContrastRatio;
  }
}

export function attachTerminal(uid: string, term: Terminal): IDisposable {
  const disposables: (() => void)[] = [];
  let frameRequest = 0;
  let expected: Expected[] = [];
  let lastTypedAt = 0;
  let bellArmed = true;
  let cursorShown = true;

  const measure = () => {
    frameRequest = 0;
    const screen = term.element?.querySelector('.xterm-screen');
    if (!screen || !term.cols || !term.rows) {
      return;
    }
    const rect = screen.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const buffer = term.buffer.active;
    const cellWidth = rect.width / term.cols;
    const cellHeight = rect.height / term.rows;
    const col = Math.min(buffer.cursorX, term.cols - 1);
    const row = buffer.cursorY;
    const frame = {
      uid,
      x: rect.left + col * cellWidth,
      y: rect.top + row * cellHeight,
      width: cellWidth,
      height: cellHeight,
      col,
      row,
      cols: term.cols,
      rows: term.rows,
      alternate: buffer.type === 'alternate',
      visible: buffer.viewportY === buffer.baseY,
      viewportY: buffer.viewportY,
      baseY: buffer.baseY,
      cursorHidden: !cursorShown,
      focused: document.activeElement === term.textarea,
      grid: {left: rect.left, top: rect.top, width: rect.width, height: rect.height}
    };

    // Only re-show characters the terminal itself has drawn: hidden input (passwords) never
    // appears in the buffer, so it can never appear in an effect either.
    const now = Date.now();
    expected = expected.filter((item) => {
      if (now - item.at > ECHO_WINDOW_MS) {
        return false;
      }
      const line = buffer.getLine(buffer.baseY + item.row);
      while (item.chars.length > 0) {
        const cell = line?.getCell(item.col);
        if (!cell || cell.getChars() !== item.chars[0]) {
          break;
        }
        emit('strike', {
          uid,
          char: item.chars[0],
          col: item.col,
          line: buffer.baseY + item.row,
          cellWidth,
          width: cellWidth * Math.max(1, cell.getWidth()),
          fg: foregroundOf(cell),
          bold: cell.isBold() !== 0
        });
        item.col += Math.max(1, cell.getWidth());
        item.chars.shift();
      }
      return item.chars.length > 0;
    });

    const bellColumn = term.cols - getSettings().typewriter.bellColumnsFromEnd;
    if (col < bellColumn - 1) {
      bellArmed = true;
    } else if (bellArmed && col >= bellColumn && Date.now() - lastTypedAt < 500) {
      bellArmed = false;
      emit('marginBell', {uid});
    }

    if (uid === activeUid) {
      emit('cursor', frame);
    }
  };

  const schedule = () => {
    if (!frameRequest) {
      frameRequest = requestAnimationFrame(measure);
    }
  };

  const listen = (disposable: IDisposable) => disposables.push(() => disposable.dispose());

  applyExtraOptions(term);
  disposables.push(subscribe(() => applyExtraOptions(term)));

  listen(term.onCursorMove(schedule));
  // Programs show and hide the cursor with DECTCEM (`ESC[?25h` / `ESC[?25l`). Watched here, and
  // left for xterm.js to apply as always (the handlers return false).
  const cursorMode = (shown: boolean) => (params: (number | number[])[]) => {
    if (params.includes(25)) {
      cursorShown = shown;
      schedule();
    }
    return false;
  };
  listen(term.parser.registerCsiHandler({prefix: '?', final: 'h'}, cursorMode(true)));
  listen(term.parser.registerCsiHandler({prefix: '?', final: 'l'}, cursorMode(false)));
  listen(term.onResize(schedule));
  listen(term.onScroll(schedule));
  listen(term.buffer.onBufferChange(schedule));
  listen(
    term.onKey(({key, domEvent}) => {
      lastTypedAt = Date.now();
      if (!domEvent.isComposing && PRINTABLE.test(key)) {
        const buffer = term.buffer.active;
        expected.push({chars: [key], col: buffer.cursorX, row: buffer.cursorY, at: lastTypedAt});
      }
      // Remember where a command was entered, so the Press can print the last command and its output.
      if (domEvent.key === 'Enter' && !domEvent.isComposing && term.buffer.active.type === 'normal') {
        const marker = term.registerMarker(0);
        if (marker) {
          const marks = [...(commandMarks.get(uid) ?? []), marker];
          marks.slice(0, -MAX_COMMAND_MARKS).forEach((old) => old.dispose());
          commandMarks.set(uid, marks.slice(-MAX_COMMAND_MARKS));
        }
      }
    })
  );

  // The ink selection effect needs the selected cells, read after xterm has updated the selection.
  let selectionRequest = 0;
  const readSelection = () => {
    selectionRequest = 0;
    emit('selection', {uid, cells: selectedCells(term)});
  };
  listen(
    term.onSelectionChange(() => {
      if (!selectionRequest) {
        selectionRequest = requestAnimationFrame(readSelection);
      }
    })
  );
  disposables.push(() => cancelAnimationFrame(selectionRequest));

  const textarea = term.textarea;
  if (textarea) {
    // Text committed by an input method (pinyin, kana…) reaches the shell without a key event.
    const onCompositionEnd = (event: CompositionEvent) => {
      const chars = Array.from(event.data).filter((char) => PRINTABLE.test(char));
      if (chars.length > 0) {
        const buffer = term.buffer.active;
        lastTypedAt = Date.now();
        expected.push({chars, col: buffer.cursorX, row: buffer.cursorY, at: lastTypedAt});
      }
    };
    textarea.addEventListener('compositionend', onCompositionEnd);
    disposables.push(() => textarea.removeEventListener('compositionend', onCompositionEnd));

    const onFocus = () => {
      activeUid = uid;
      schedule();
    };
    textarea.addEventListener('focus', onFocus);
    disposables.push(() => textarea.removeEventListener('focus', onFocus));
    textarea.addEventListener('blur', schedule);
    disposables.push(() => textarea.removeEventListener('blur', schedule));
    if (document.activeElement === textarea) {
      onFocus();
    }
  }

  if (term.element) {
    const observer = new ResizeObserver(schedule);
    observer.observe(term.element);
    disposables.push(() => observer.disconnect());
    // Scrolling with the wheel or the scrollbar moves the viewport without term.onScroll.
    const viewport = term.element.querySelector('.xterm-viewport');
    if (viewport) {
      viewport.addEventListener('scroll', schedule, {passive: true});
      disposables.push(() => viewport.removeEventListener('scroll', schedule));
    }

    // xterm reports a selection only when the mouse is released. While the user drags, the ink
    // selection follows the mouse frame by frame, so they can see how far it reaches.
    const element = term.element;
    let dragFrame = 0;
    let dragKey = '';
    const followDrag = () => {
      const range = term.getSelectionPosition();
      const key = range ? `${range.start.x},${range.start.y},${range.end.x},${range.end.y}` : '';
      if (key !== dragKey) {
        dragKey = key;
        emit('selection', {uid, cells: selectedCells(term)});
      }
      dragFrame = requestAnimationFrame(followDrag);
    };
    const stopDrag = () => {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      window.removeEventListener('mouseup', stopDrag);
    };
    const startDrag = (event: MouseEvent) => {
      if (event.button !== 0 || dragFrame) {
        return;
      }
      // Differs from every range, so the first frame always reports (a new drag clears the old one).
      dragKey = 'start';
      window.addEventListener('mouseup', stopDrag);
      dragFrame = requestAnimationFrame(followDrag);
    };
    element.addEventListener('mousedown', startDrag);
    disposables.push(() => {
      element.removeEventListener('mousedown', startDrag);
      stopDrag();
    });
  }

  // Layout changes outside the terminal (focus mode, studio panel) move the grid on screen.
  disposables.push(on('key', schedule));
  window.addEventListener('resize', schedule);
  disposables.push(() => window.removeEventListener('resize', schedule));

  if (activeUid === null) {
    activeUid = uid;
  }
  terminals.set(uid, term);
  disposables.push(() => {
    terminals.delete(uid);
    commandMarks.get(uid)?.forEach((marker) => marker.dispose());
    commandMarks.delete(uid);
  });
  schedule();

  return {
    dispose() {
      if (frameRequest) {
        cancelAnimationFrame(frameRequest);
      }
      disposables.forEach((dispose) => dispose());
      if (activeUid === uid) {
        activeUid = null;
      }
    }
  };
}

/** Marks a terminal as the one whose cursor drives the carriage and lighting. */
export function setActiveTerminal(uid: string | null) {
  activeUid = uid;
}

/** The cells of the current selection, line by line (empty when nothing is selected). */
function selectedCells(term: Terminal): SelectedCell[] {
  const range = term.getSelectionPosition();
  if (!range) {
    return [];
  }
  const buffer = term.buffer.active;
  const cells: SelectedCell[] = [];
  for (let line = range.start.y; line <= range.end.y && cells.length < MAX_SELECTED_CELLS; line++) {
    const row = buffer.getLine(line);
    if (!row) {
      continue;
    }
    const first = line === range.start.y ? range.start.x : 0;
    const last = line === range.end.y ? range.end.x : term.cols;
    for (let col = first; col < last && cells.length < MAX_SELECTED_CELLS; col++) {
      const cell = row.getCell(col);
      const char = cell?.getChars() ?? '';
      if (cell && char && char !== ' ') {
        const fg = foregroundOf(cell);
        cells.push({line, col, char, width: Math.max(1, cell.getWidth()), fg, bold: cell.isBold() !== 0});
      }
    }
  }
  return cells;
}

const rowsText = (term: Terminal, from: number, to: number) => {
  const buffer = term.buffer.active;
  const rows: string[] = [];
  for (let line = from; line <= to; line++) {
    rows.push(buffer.getLine(line)?.translateToString(true) ?? '');
  }
  while (rows.length > 0 && !rows[rows.length - 1].trim()) {
    rows.pop();
  }
  return rows.join('\n');
};

export type TerminalTextKind = 'command' | 'selection' | 'screen';

/**
 * Text of the active terminal for the Press, read only when the user asks to print: the last
 * command with its output (from where it was entered up to the current prompt), the current
 * selection, or the rows visible on screen.
 */
export function activeTerminalText(kind: TerminalTextKind): string {
  const term = activeUid ? terminals.get(activeUid) : undefined;
  if (!term) {
    return '';
  }
  if (kind === 'selection') {
    return term.getSelection();
  }
  const buffer = term.buffer.active;
  if (kind === 'command') {
    const marks = (activeUid ? commandMarks.get(activeUid) : undefined) ?? [];
    const prompt = buffer.baseY + buffer.cursorY;
    const promptText = buffer.getLine(prompt)?.translateToString(true).trim();
    // The most recent command that has finished: its line is above the prompt the cursor is on, and
    // it is not a bare prompt (Enter pressed on an empty line).
    const mark = [...marks].reverse().find((marker) => {
      if (marker.isDisposed || marker.line < 0 || marker.line >= prompt) {
        return false;
      }
      return buffer.getLine(marker.line)?.translateToString(true).trim() !== promptText;
    });
    if (mark && buffer.type === 'normal') {
      const text = rowsText(term, mark.line, prompt - 1);
      if (text.trim()) {
        return text;
      }
    }
  }
  return rowsText(term, buffer.viewportY, buffer.viewportY + term.rows - 1);
}

/** Scrolls the active terminal to its top, its bottom or a buffer line. */
export function scrollActiveTerminal(to: 'top' | 'bottom' | number) {
  const term = activeUid ? terminals.get(activeUid) : undefined;
  if (!term) {
    return;
  }
  if (to === 'top') {
    term.scrollToTop();
  } else if (to === 'bottom') {
    term.scrollToBottom();
  } else {
    term.scrollToLine(Math.max(0, Math.round(to)));
  }
}
