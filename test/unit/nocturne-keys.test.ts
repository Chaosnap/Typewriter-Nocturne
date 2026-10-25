import test from 'ava';

import {compositionKind, keyKind} from '../../lib/nocturne/typewriter/keys';
import type {KeyLike} from '../../lib/nocturne/typewriter/keys';

const key = (fields: Partial<KeyLike>): KeyLike => ({
  key: '',
  code: '',
  isComposing: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...fields
});

test('keys strike type; shortcuts and modifiers do not', (t) => {
  t.is(keyKind(key({key: 'a', code: 'KeyA'})), 'key');
  t.is(keyKind(key({key: ' ', code: 'Space'})), 'space');
  t.is(keyKind(key({key: 'Enter', code: 'Enter'})), 'return');
  t.is(keyKind(key({key: 'Tab', code: 'Tab'})), 'tab');
  t.is(keyKind(key({key: 'Delete', code: 'Delete'})), 'backspace');
  t.is(keyKind(key({key: 'c', code: 'KeyC', ctrlKey: true})), null);
  t.is(keyKind(key({key: 'v', code: 'KeyV', metaKey: true})), null);
  t.is(keyKind(key({key: '@', code: 'KeyQ', ctrlKey: true, altKey: true})), 'key');
  t.is(keyKind(key({key: 'Shift', code: 'ShiftLeft'})), null);
});

test('history and cursor keys have their own kinds', (t) => {
  t.is(keyKind(key({key: 'ArrowUp', code: 'ArrowUp'})), 'up');
  t.is(keyKind(key({key: 'ArrowDown', code: 'ArrowDown'})), 'down');
  t.is(keyKind(key({key: 'ArrowLeft', code: 'ArrowLeft'})), 'left');
  t.is(keyKind(key({key: 'ArrowRight', code: 'ArrowRight'})), 'right');
});

test('inside an input method, letters wait for the composition; paging candidates is a select', (t) => {
  t.is(keyKind(key({key: 'Process', code: 'KeyN', keyCode: 229})), null);
  t.is(keyKind(key({key: 'n', code: 'KeyN', isComposing: true})), null);
  t.is(keyKind(key({key: 'Process', code: 'ArrowDown', keyCode: 229})), 'select');
  t.is(keyKind(key({key: 'Process', code: 'Equal', keyCode: 229})), 'select');
});

test('each change of the preedit text strikes once', (t) => {
  t.is(compositionKind('', 'n'), 'compose');
  t.is(compositionKind('ni', 'nih'), 'compose');
  t.is(compositionKind('nih', 'ni'), 'backspace');
  t.is(compositionKind('かんじ', '漢字'), 'backspace');
  t.is(compositionKind('かな', 'カナ'), 'select');
  t.is(compositionKind('ni', 'ni'), null);
});
