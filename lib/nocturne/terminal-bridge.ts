// Read-only bridge between one xterm.js Terminal and the Nocturne layer.
//
// It reads cursor geometry after xterm has rendered and publishes it on the bus, applies the two
// xterm options Hyper does not expose (cursor width, minimum contrast ratio), and detects echoed
// keystrokes for the afterimage / ink-bloom effects. It never writes to the terminal, never
// subscribes to PTY data and never delays input.

import type {IBufferCell, IDisposable, Terminal} from 'xterm';

import {extraTerminalOptions} from '../../app/nocturne/apply-config';

import {emit, on} from './bus';
import {getSettings, subscribe} from './store';

let activeUid: string | null = null;
const terminals = new Map<string, Terminal>();

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
    })
  );

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
    if (document.activeElement === textarea) {
      onFocus();
    }
  }

  if (term.element) {
    const observer = new ResizeObserver(schedule);
    observer.observe(term.element);
    disposables.push(() => observer.disconnect());
  }

  // Layout changes outside the terminal (focus mode, studio panel) move the grid on screen.
  disposables.push(on('key', schedule));
  window.addEventListener('resize', schedule);
  disposables.push(() => window.removeEventListener('resize', schedule));

  if (activeUid === null) {
    activeUid = uid;
  }
  terminals.set(uid, term);
  disposables.push(() => terminals.delete(uid));
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

/**
 * Text of the active terminal for the Press, read only when the user asks to print: the current
 * selection, or the rows visible on screen.
 */
export function activeTerminalText(kind: 'selection' | 'screen'): string {
  const term = activeUid ? terminals.get(activeUid) : undefined;
  if (!term) {
    return '';
  }
  if (kind === 'selection') {
    return term.getSelection();
  }
  const buffer = term.buffer.active;
  const rows: string[] = [];
  for (let i = 0; i < term.rows; i++) {
    rows.push(buffer.getLine(buffer.viewportY + i)?.translateToString(true) ?? '');
  }
  return rows.join('\n');
}
