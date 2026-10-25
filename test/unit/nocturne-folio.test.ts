import test from 'ava';

import {
  FOLIO_LIMITS,
  folioDate,
  isFolioId,
  sanitizeDraft,
  sanitizeFolio,
  toRoman,
  verseLines
} from '../../app/nocturne/folio';

test('a draft keeps plain text only, within limits', (t) => {
  const raw = {title: '  On\tLeaves \u001b[31m', text: 'ls\r\n\u001b[2Jecho hi\u0007 \ue0a0', source: 'screen'};
  t.deepEqual(sanitizeDraft(raw), {title: 'On Leaves [31m', text: 'ls\n[2Jecho hi \ue0a0', source: 'screen'});
  t.is(sanitizeDraft({text: 'x'.repeat(FOLIO_LIMITS.text + 50)})?.text.length, FOLIO_LIMITS.text);
  t.is(sanitizeDraft({text: 'x', source: 'elsewhere'})?.source, 'snippet');
});

test('empty or malformed drafts are refused', (t) => {
  t.is(sanitizeDraft({text: '   \n\t'}), null);
  t.is(sanitizeDraft({title: 'no text'}), null);
  t.is(sanitizeDraft('text'), null);
});

test('stored folios need a generated id and a valid date', (t) => {
  const good = {id: 'lx2abc-0a1b2c3d', number: 3, createdAt: '2026-10-25T08:00:00.000Z', title: 'A', text: 'b'};
  t.is(sanitizeFolio(good)?.number, 3);
  t.is(sanitizeFolio({...good, id: '../../etc/passwd'}), null);
  t.is(sanitizeFolio({...good, createdAt: 'yesterday'}), null);
  t.is(sanitizeFolio({...good, number: -2})?.number, 1);
  t.false(isFolioId('a-b'));
});

test('Roman numerals', (t) => {
  t.is(toRoman(18), 'XVIII');
  t.is(toRoman(1994), 'MCMXCIV');
  t.is(toRoman(0), 'I');
});

test('verse lines: every fourth line numbered, one break between stanzas, tabs expanded', (t) => {
  const lines = verseLines('\n\na\n\tb\nc\nd\n\n\n\ne\n\n');
  t.deepEqual(
    lines.map((line) => [line.text, line.number, line.stanzaBreak]),
    [
      ['a', null, false],
      ['    b', null, false],
      ['c', null, false],
      ['d', 4, false],
      ['', null, true],
      ['e', null, false]
    ]
  );
  t.is(verseLines(Array(FOLIO_LIMITS.lines + 20).fill('x').join('\n')).length, FOLIO_LIMITS.lines);
});

test('dates read like a letter', (t) => {
  const date = new Date(2026, 9, 25, 12).toISOString();
  t.is(folioDate(date), 'the 25th of October, 2026');
  t.is(folioDate(new Date(2026, 0, 1, 12).toISOString()), 'the 1st of January, 2026');
  t.is(folioDate(new Date(2026, 0, 12, 12).toISOString()), 'the 12th of January, 2026');
});
