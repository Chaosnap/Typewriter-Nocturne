// Passive observation of keys typed into a terminal, for the typewriter sounds and the head.
//
// The listeners are passive and run in the capture phase. They never call preventDefault() or
// stopPropagation(), never read the terminal and never write to it, so xterm.js and the input
// method receive every key exactly as before and nothing is delayed. Only the kind of key is
// published, not the key.
//
// Input methods (pinyin, kana, hangul…) report every keystroke as "Process" while composing, so the
// composition itself is followed instead: each change of the preedit text strikes a key, choosing
// a candidate is a softer `select`, and handing the composed text to the shell is a `commit`.

import {emit} from '../bus';
import type {KeyKind} from '../bus';

export type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'isComposing' | 'metaKey' | 'ctrlKey' | 'altKey'> & {
  keyCode?: number;
};

const CANDIDATE_KEYS = /^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|Tab|Minus|Equal|Comma|Period)$/;

const isTerminalInput = (target: EventTarget | null) =>
  target instanceof HTMLTextAreaElement && target.classList.contains('xterm-helper-textarea');

/** The kind of a keydown, or null for keys that strike no type (shortcuts, modifiers). */
export function keyKind(event: KeyLike): KeyKind | null {
  if (event.isComposing || event.key === 'Process' || event.keyCode === 229) {
    // Inside a composition only paging through candidates is reported here; typed letters arrive
    // as composition updates.
    return CANDIDATE_KEYS.test(event.code) ? 'select' : null;
  }
  if (event.key === 'Dead') {
    return null;
  }
  // Shortcuts and control keys (Cmd+…, Ctrl+C) strike no type. AltGr arrives as Ctrl+Alt.
  if (event.metaKey || (event.ctrlKey && !event.altKey)) {
    return null;
  }
  switch (event.key) {
    case 'Enter':
      return 'return';
    case 'Backspace':
    case 'Delete':
      return 'backspace';
    case ' ':
      return 'space';
    case 'Tab':
      return 'tab';
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return Array.from(event.key).length === 1 ? 'key' : null;
  }
}

/** The kind of a change of the preedit text from `previous` to `next`. */
export function compositionKind(previous: string, next: string): KeyKind | null {
  const before = Array.from(previous).length;
  const after = Array.from(next).length;
  if (after > before) {
    return 'compose';
  }
  if (after < before) {
    return 'backspace';
  }
  return previous === next ? null : 'select';
}

/** Starts observing; returns a function that stops. */
export function observeKeys(): () => void {
  let preedit = '';
  const publish = (kind: KeyKind | null, repeat = false) => {
    if (kind) {
      emit('key', {kind, repeat});
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (isTerminalInput(event.target)) {
      publish(keyKind(event), event.repeat);
    }
  };
  const onCompositionStart = (event: CompositionEvent) => {
    if (isTerminalInput(event.target)) {
      preedit = '';
    }
  };
  const onCompositionUpdate = (event: CompositionEvent) => {
    if (isTerminalInput(event.target)) {
      publish(compositionKind(preedit, event.data));
      preedit = event.data;
    }
  };
  const onCompositionEnd = (event: CompositionEvent) => {
    if (isTerminalInput(event.target)) {
      publish(event.data ? 'commit' : null);
      preedit = '';
    }
  };
  const options = {capture: true, passive: true};
  window.addEventListener('keydown', onKeyDown, options);
  window.addEventListener('compositionstart', onCompositionStart, options);
  window.addEventListener('compositionupdate', onCompositionUpdate, options);
  window.addEventListener('compositionend', onCompositionEnd, options);
  return () => {
    window.removeEventListener('keydown', onKeyDown, options);
    window.removeEventListener('compositionstart', onCompositionStart, options);
    window.removeEventListener('compositionupdate', onCompositionUpdate, options);
    window.removeEventListener('compositionend', onCompositionEnd, options);
  };
}
