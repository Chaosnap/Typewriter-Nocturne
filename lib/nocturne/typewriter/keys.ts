// Passive observation of keys typed into a terminal, for the typewriter sounds and the platen.
//
// The listeners are passive and run in the capture phase. They never call preventDefault() or
// stopPropagation(), never read the terminal and never write to it, so xterm.js receives every
// key exactly as before and nothing is delayed. Only the kind of key is published, not the key.

import {emit} from '../bus';
import type {KeyKind} from '../bus';

const isTerminalInput = (target: EventTarget | null) =>
  target instanceof HTMLTextAreaElement && target.classList.contains('xterm-helper-textarea');

function kindOf(event: KeyboardEvent): KeyKind | null {
  // IME composition is reported once, when the composed text is committed.
  if (event.isComposing || event.key === 'Process' || event.key === 'Dead') {
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
      return 'backspace';
    case ' ':
      return 'space';
    case 'Tab':
      return 'key';
    default:
      return Array.from(event.key).length === 1 ? 'key' : null;
  }
}

/** Starts observing; returns a function that stops. */
export function observeKeys(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isTerminalInput(event.target)) {
      return;
    }
    const kind = kindOf(event);
    if (kind) {
      emit('key', {kind, repeat: event.repeat});
    }
  };
  const onCompositionEnd = (event: CompositionEvent) => {
    if (isTerminalInput(event.target) && event.data) {
      emit('key', {kind: 'composition', repeat: false});
    }
  };
  const options = {capture: true, passive: true};
  window.addEventListener('keydown', onKeyDown, options);
  window.addEventListener('compositionend', onCompositionEnd, options);
  return () => {
    window.removeEventListener('keydown', onKeyDown, options);
    window.removeEventListener('compositionend', onCompositionEnd, options);
  };
}
