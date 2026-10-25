// The Press: print a code snippet or a piece of terminal output as a folio, set like a sonnet and
// sealed in wax, and keep it in the Archive. Terminal text is read only when the user picks it
// here; folios stay on this computer.

import {clipboard} from 'electron';
import React, {useEffect, useRef, useState} from 'react';

import {sanitizeDraft, toRoman, verseLines} from '../../../app/nocturne/folio';
import type {Folio, FolioDraft, FolioSource} from '../../../app/nocturne/folio';
import {DISPLAY_SERIF, fontStack, UI_SERIF} from '../../../app/nocturne/settings';
import type {NocturneSettings} from '../../../app/nocturne/types';
import {emit} from '../bus';
import {Segmented, Switch} from '../components/controls';
import {updateSettings} from '../store';
import {activeTerminalText} from '../terminal-bridge';

import {exportFolioImage, keepFolio, listFolios, removeFolio, revealArchive} from './archive';
import {drawFolio} from './folio-canvas';

export type PressTab = 'print' | 'archive';

type Shown = {draft: FolioDraft; number: number | null; createdAt: string};

const SOURCES: readonly {value: FolioSource; label: string}[] = [
  {value: 'selection', label: 'Selection'},
  {value: 'screen', label: 'Screen'},
  {value: 'snippet', label: 'Snippet'}
];

const TABS: readonly {value: PressTab; label: string}[] = [
  {value: 'print', label: 'Print'},
  {value: 'archive', label: 'Archive'}
];

const SEAL_MS = 420;

type PressProps = {
  settings: NocturneSettings;
  initialTab: PressTab;
  onClose: () => void;
};

export function Press({settings, initialTab, onClose}: PressProps) {
  const [tab, setTab] = useState<PressTab>(initialTab);
  const [source, setSource] = useState<FolioSource>('snippet');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [folios, setFolios] = useState<Folio[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [printed, setPrinted] = useState(false);
  const [hasSheet, setHasSheet] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = useRef<Shown | null>(null);
  const animation = useRef(0);

  const fonts = {serif: UI_SERIF, display: DISPLAY_SERIF, mono: fontStack(settings.typography)};

  const draw = (progress: number, seal: number) => {
    const canvas = canvasRef.current;
    if (canvas && shown.current) {
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      drawFolio(canvas, {...shown.current, progress, seal, fonts, pixelRatio});
    }
  };

  const refresh = async () => {
    setFolios(await listFolios());
  };

  const pick = (next: FolioSource) => {
    setSource(next);
    if (next !== 'snippet') {
      setText(activeTerminalText(next));
    }
  };

  useEffect(() => {
    // Open on the selection if there is one: that is usually what the user wants printed.
    const selection = activeTerminalText('selection');
    if (selection.trim()) {
      setSource('selection');
      setText(selection);
    }
    void refresh();
    return () => cancelAnimationFrame(animation.current);
  }, []);

  /** Types the folio line by line, then lowers and presses the seal. */
  const animate = () => {
    cancelAnimationFrame(animation.current);
    setPrinted(false);
    const lines = shown.current ? verseLines(shown.current.draft.text).length : 1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      draw(1, 1);
      emit('cue', {kind: 'seal'});
      setPrinted(true);
      return;
    }
    const duration = Math.min(2600, Math.max(900, lines * 85));
    const started = performance.now();
    let typed = 0;
    let sealed = false;
    emit('cue', {kind: 'print'});
    const frame = (now: number) => {
      const elapsed = now - started;
      const progress = Math.min(1, elapsed / duration);
      const line = Math.floor(progress * lines);
      if (line > typed && progress < 1) {
        typed = line;
        emit('cue', {kind: 'line'});
      }
      const seal = progress < 1 ? 0 : Math.min(1, (elapsed - duration) / SEAL_MS);
      if (!sealed && seal >= 0.75) {
        sealed = true;
        emit('cue', {kind: 'seal'});
      }
      draw(progress, seal);
      if (seal < 1) {
        animation.current = requestAnimationFrame(frame);
      } else {
        setPrinted(true);
      }
    };
    animation.current = requestAnimationFrame(frame);
  };

  const print = async () => {
    const draft = sanitizeDraft({title, text, source});
    if (!draft) {
      setMessage('There is nothing to print yet.');
      return;
    }
    let number: number | null = null;
    let createdAt = new Date().toISOString();
    if (settings.print.keepInArchive) {
      const kept = await keepFolio(draft);
      if (kept) {
        number = kept.number;
        createdAt = kept.createdAt;
        void refresh();
      }
    }
    shown.current = {draft, number, createdAt};
    setHasSheet(true);
    setSelected(null);
    setMessage(number ? `Kept in the Archive as Sonnet ${toRoman(number)}.` : 'Printed; not kept in the Archive.');
    animate();
  };

  const show = (folio: Folio) => {
    cancelAnimationFrame(animation.current);
    shown.current = {draft: folio, number: folio.number, createdAt: folio.createdAt};
    setHasSheet(true);
    setSelected(folio.id);
    setConfirmDelete(null);
    setPrinted(true);
    draw(1, 1);
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !shown.current) {
      return;
    }
    const name = shown.current.draft.title || 'Folio';
    const saved = await exportFolioImage(name, canvas.toDataURL('image/png'));
    setMessage(saved ? 'The page was saved as an image.' : '');
  };

  const copyText = () => {
    if (shown.current) {
      clipboard.writeText(shown.current.draft.text);
      setMessage('The text was copied.');
    }
  };

  const remove = async (folio: Folio) => {
    if (confirmDelete !== folio.id) {
      setConfirmDelete(folio.id);
      return;
    }
    await removeFolio(folio.id);
    setConfirmDelete(null);
    if (selected === folio.id) {
      shown.current = null;
      setSelected(null);
      setPrinted(false);
      setHasSheet(false);
    }
    await refresh();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <aside
      className="tn-press"
      aria-label="The Press"
      data-state={printed ? 'printed' : 'composing'}
      onKeyDown={onKeyDown}
    >
      <div className="tn-press-side">
        <div className="tn-studio-head">
          <div>
            <div className="tn-eyebrow">The Press</div>
            <h2>Sonnets in Code</h2>
          </div>
          <button type="button" className="tn-close" aria-label="Close the Press" onClick={onClose}>
            ×
          </button>
        </div>
        <Segmented label="Press" value={tab} options={TABS} onChange={setTab} />
        {tab === 'print' ? (
          <div className="tn-press-form">
            <Segmented label="Print from" value={source} options={SOURCES} onChange={pick} />
            <input
              className="tn-input"
              value={title}
              placeholder="Title, e.g. On the Recursion of Leaves"
              aria-label="Title"
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <textarea
              className="tn-input tn-press-text"
              value={text}
              placeholder="Paste a code snippet, or pick the terminal's selection or screen above."
              aria-label="Text to print"
              spellCheck={false}
              autoFocus
              onChange={(event) => {
                setText(event.currentTarget.value);
                setSource('snippet');
              }}
            />
            <button type="button" className="tn-button tn-button-primary" onClick={() => void print()}>
              Print and seal
            </button>
            <Switch
              label="Keep in the Archive"
              checked={settings.print.keepInArchive}
              onChange={(keepInArchive) => updateSettings({print: {keepInArchive}})}
            />
          </div>
        ) : (
          <div className="tn-press-archive">
            {folios.length === 0 ? <p className="tn-note">No folios yet. Printed pages are kept here.</p> : null}
            <ul className="tn-folios">
              {folios.map((folio) => (
                <li key={folio.id} className={selected === folio.id ? 'tn-folio tn-folio-selected' : 'tn-folio'}>
                  <button type="button" className="tn-folio-open" onClick={() => show(folio)}>
                    <span className="tn-folio-number">{toRoman(folio.number)}</span>
                    <span className="tn-folio-title">{folio.title || 'Untitled'}</span>
                    <span className="tn-folio-date">{new Date(folio.createdAt).toLocaleDateString()}</span>
                  </button>
                  <button type="button" className="tn-folio-delete" onClick={() => void remove(folio)}>
                    {confirmDelete === folio.id ? 'Delete?' : '×'}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="tn-button" onClick={() => void revealArchive()}>
              Open the archive folder
            </button>
          </div>
        )}
        {printed ? (
          <div className="tn-press-actions">
            <button type="button" className="tn-button" onClick={() => void saveImage()}>
              Save as image…
            </button>
            <button type="button" className="tn-button" onClick={copyText}>
              Copy text
            </button>
          </div>
        ) : null}
        {message ? <p className="tn-note">{message}</p> : null}
      </div>
      <div className="tn-press-sheet">
        {hasSheet ? null : <p className="tn-press-hint">The folio appears here, typed and sealed.</p>}
        <canvas ref={canvasRef} aria-label="The printed folio" hidden={!hasSheet} />
      </div>
    </aside>
  );
}
