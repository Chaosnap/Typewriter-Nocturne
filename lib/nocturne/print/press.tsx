// The Press: print a code snippet or a piece of terminal output as a folio, set like a sonnet and
// sealed in wax, and keep it in the Archive. Terminal text is read only when the user picks it
// here; folios stay on this computer.

import {clipboard} from 'electron';
import React, {useEffect, useRef, useState} from 'react';

import {sanitizeDraft, toRoman, verseLines} from '../../../app/nocturne/folio';
import type {Folio, FolioDraft, FolioSource} from '../../../app/nocturne/folio';
import {DISPLAY_SERIF, folioFontStack, sanitizeFolioStyle, UI_SERIF} from '../../../app/nocturne/settings';
import type {
  FolioFont,
  FolioPaperId,
  FolioStyle,
  NocturneSettings,
  RibbonStyle,
  SealColor,
  SealEmblem
} from '../../../app/nocturne/types';
import {emit} from '../bus';
import {Segmented, Switch} from '../components/controls';
import {updateSettings} from '../store';
import {activeTerminalText} from '../terminal-bridge';

import {exportFolioImage, keepFolio, listFolios, removeFolio, renameFolio, revealArchive} from './archive';
import {drawFolio, FOLIO_PAPERS} from './folio-canvas';
import {drawSeal, SEAL_PALETTES} from './seal';

export type PressTab = 'print' | 'archive';

type Shown = {draft: FolioDraft; number: number | null; createdAt: string};

type TerminalSource = Exclude<FolioSource, 'snippet'>;

const SOURCES: readonly {value: FolioSource; label: string}[] = [
  {value: 'selection', label: 'Selection'},
  {value: 'screen', label: 'Screen'},
  {value: 'command', label: 'Command'},
  {value: 'snippet', label: 'Snippet'}
];

const SOURCE_NOTES: Record<TerminalSource, {found: string; empty: string}> = {
  selection: {found: 'The text selected in the terminal', empty: 'Nothing is selected in the terminal.'},
  screen: {found: 'What the terminal shows now', empty: 'The terminal is empty.'},
  command: {found: 'The last command you ran, with its output', empty: 'No command has been run here yet.'}
};

const TABS: readonly {value: PressTab; label: string}[] = [
  {value: 'print', label: 'Print'},
  {value: 'archive', label: 'Archive'}
];

const PAPERS: readonly {value: FolioPaperId; label: string}[] = [
  {value: 'laid', label: 'Laid'},
  {value: 'cotton', label: 'Cotton'},
  {value: 'vellum', label: 'Vellum'},
  {value: 'parchment', label: 'Parchment'},
  {value: 'night', label: 'Night'}
];

const SEALS: readonly {value: SealColor; label: string}[] = [
  {value: 'crimson', label: 'Crimson'},
  {value: 'oxblood', label: 'Oxblood'},
  {value: 'black', label: 'Black'},
  {value: 'gold', label: 'Gold'},
  {value: 'emerald', label: 'Emerald'},
  {value: 'sapphire', label: 'Sapphire'}
];

const EMBLEMS: readonly {value: SealEmblem; label: string}[] = [
  {value: 'moon', label: 'Moon'},
  {value: 'rose', label: 'Rose'},
  {value: 'quill', label: 'Quill'},
  {value: 'none', label: 'None'}
];

const RIBBONS: readonly {value: RibbonStyle; label: string}[] = [
  {value: 'tails', label: 'Swallowtails'},
  {value: 'loop', label: 'Loop'},
  {value: 'band', label: 'Band'},
  {value: 'cross', label: 'Cross'},
  {value: 'banner', label: 'Banner'},
  {value: 'pendant', label: 'Pendant'}
];

const FACES: readonly {value: FolioFont; label: string}[] = [
  {value: 'typewriter', label: 'Typewriter — Courier Prime'},
  {value: 'sonnet', label: 'Sonnet — EB Garamond'},
  {value: 'display', label: 'Display — Cormorant Garamond'},
  {value: 'plex', label: 'IBM Plex Mono'},
  {value: 'terminal', label: 'The terminal’s font'},
  {value: 'custom', label: 'Custom font…'}
];

const SEAL_MS = 420;
const PREVIEW_SIZE = 76;
/** A ribbon chip: its size and the radius of the little seal on it. */
const CHIP = {width: 40, height: 54, radius: 9};

/** Set on the preview until there is something to print, so every choice still shows on the sheet. */
const SAMPLE = '// The verse you print is set here,\n// line by line, beneath the lamp.';

type SwatchesProps<T extends string> = {
  label: string;
  value: T;
  options: readonly {value: T; label: string}[];
  color: (value: T) => string;
  onChange: (value: T) => void;
};

/** A row of round colour chips, the chosen one named beside the label. */
function Swatches<T extends string>({label, value, options, color, onChange}: SwatchesProps<T>) {
  const current = options.find((option) => option.value === value);
  return (
    <div className="tn-slider">
      <div className="tn-slider-head">
        <span className="tn-label">{label}</span>
        <span className="tn-value">{current?.label}</span>
      </div>
      <div className="tn-swatches" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="tn-swatch"
            style={{background: color(option.value)}}
            aria-label={option.label}
            aria-pressed={option.value === value}
            title={option.label}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

const paperChip = (paper: FolioPaperId) => FOLIO_PAPERS[paper].ground;

const waxChip = (color: SealColor) => {
  const [lit, body, dark] = SEAL_PALETTES[color].wax;
  return `radial-gradient(circle at 35% 30%, ${lit}, ${body} 55%, ${dark})`;
};

/** The seal as it will be pressed, redrawn as its options change. */
function SealPreview({style}: {style: FolioStyle}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) {
      return;
    }
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = PREVIEW_SIZE * ratio;
    canvas.height = PREVIEW_SIZE * ratio;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    const sealStyle = {
      seed: 9.59,
      monogram: style.monogram,
      color: style.sealColor,
      emblem: style.emblem,
      ribbon: null,
      display: DISPLAY_SERIF
    };
    drawSeal(c, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE * 0.36, sealStyle);
  }, [style.monogram, style.sealColor, style.emblem]);
  return <canvas ref={canvasRef} className="tn-seal-preview" aria-hidden="true" />;
}

/** A little seal on one way of laying the ribbon, in the chosen wax and its silk. */
function RibbonChip({ribbon, color}: {ribbon: RibbonStyle; color: SealColor}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) {
      return;
    }
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = CHIP.width * ratio;
    canvas.height = CHIP.height * ratio;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, CHIP.width, CHIP.height);
    const sealStyle = {seed: 9.59, monogram: '', color, emblem: 'none' as const, ribbon, display: DISPLAY_SERIF};
    drawSeal(c, CHIP.width / 2, CHIP.height * 0.44, CHIP.radius, sealStyle);
  }, [ribbon, color]);
  return <canvas ref={canvasRef} className="tn-ribbon-chip" aria-hidden="true" />;
}

type RibbonChoicesProps = {
  value: RibbonStyle;
  color: SealColor;
  onChange: (value: RibbonStyle) => void;
};

/** The ways of laying the silk, each shown under a little seal; the chosen one named beside the label. */
function RibbonChoices({value, color, onChange}: RibbonChoicesProps) {
  const current = RIBBONS.find((option) => option.value === value);
  return (
    <div className="tn-slider">
      <div className="tn-slider-head">
        <span className="tn-label">Ribbon</span>
        <span className="tn-value">{current?.label}</span>
      </div>
      <div className="tn-ribbons" role="group" aria-label="Ribbon">
        {RIBBONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="tn-ribbon"
            aria-label={option.label}
            aria-pressed={option.value === value}
            title={option.label}
            onClick={() => onChange(option.value)}
          >
            <RibbonChip ribbon={option.value} color={color} />
          </button>
        ))}
      </div>
    </div>
  );
}

type PressProps = {
  settings: NocturneSettings;
  initialTab: PressTab;
  onClose: () => void;
};

export function Press({settings, initialTab, onClose}: PressProps) {
  const saved = settings.print.style;
  const [tab, setTab] = useState<PressTab>(initialTab);
  const [source, setSource] = useState<FolioSource>('snippet');
  const [title, setTitle] = useState('');
  const [snippet, setSnippet] = useState('');
  const [taken, setTaken] = useState('');
  const [monogram, setMonogram] = useState(saved.monogram);
  const [signature, setSignature] = useState(saved.signature);
  const [customFont, setCustomFont] = useState(saved.customFont);
  const [folios, setFolios] = useState<Folio[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState('');
  const [printed, setPrinted] = useState(false);
  const [preview, setPreview] = useState(false);
  const [hasSheet, setHasSheet] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = useRef<Shown | null>(null);
  const animation = useRef(0);
  const printing = useRef(false);
  const renameTarget = useRef<string | null>(null);

  // The options as they stand, typed fields included; invalid entries fall back to the saved ones.
  const style = sanitizeFolioStyle({...saved, monogram, signature, customFont}, saved);

  const changeStyle = (patch: Partial<FolioStyle>) => {
    updateSettings({print: {style: {...style, ...patch}}});
  };

  const commitTyped = () => {
    updateSettings({print: {style}});
  };

  const draw = (progress: number, seal: number) => {
    const canvas = canvasRef.current;
    if (canvas && shown.current) {
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const face = folioFontStack(shown.current.draft.style, settings.typography);
      const fonts = {serif: UI_SERIF, display: DISPLAY_SERIF, text: face.family, textSize: face.size};
      drawFolio(canvas, {...shown.current, progress, seal, fonts, pixelRatio});
    }
  };

  const refresh = async () => {
    setFolios(await listFolios());
  };

  // While composing, the sheet shows the folio as it will print, redrawn with every choice.
  const composed = source === 'snippet' ? snippet : taken;
  const styleKey = JSON.stringify(style);
  useEffect(() => {
    if (tab !== 'print' || printing.current) {
      return;
    }
    const text = composed.trim() ? composed : SAMPLE;
    const draft = sanitizeDraft({title, text, source, style});
    if (!draft) {
      return;
    }
    cancelAnimationFrame(animation.current);
    shown.current = {draft, number: null, createdAt: new Date().toISOString()};
    setHasSheet(true);
    setPreview(true);
    setPrinted(false);
    setSelected(null);
    draw(1, 1);
  }, [tab, source, title, composed, styleKey]);

  const pick = (next: FolioSource) => {
    setSource(next);
    if (next !== 'snippet') {
      setTaken(activeTerminalText(next));
    }
  };

  useEffect(() => {
    // Open on the selection if there is one: that is usually what the user wants printed.
    const selection = activeTerminalText('selection');
    if (selection.trim()) {
      setSource('selection');
      setTaken(selection);
    }
    void refresh();
    return () => cancelAnimationFrame(animation.current);
  }, []);

  /** Types the folio line by line, then lowers and presses the seal. */
  const animate = () => {
    cancelAnimationFrame(animation.current);
    printing.current = true;
    setPreview(false);
    setPrinted(false);
    const lines = shown.current ? verseLines(shown.current.draft.text).length : 1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      draw(1, 1);
      emit('cue', {kind: 'seal'});
      printing.current = false;
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
        printing.current = false;
        setPrinted(true);
      }
    };
    animation.current = requestAnimationFrame(frame);
  };

  const print = async () => {
    // Terminal text is read again as it is printed, so it is what the terminal holds now.
    printing.current = true;
    const text = source === 'snippet' ? snippet : activeTerminalText(source);
    if (source !== 'snippet') {
      setTaken(text);
    }
    commitTyped();
    const draft = sanitizeDraft({title, text, source, style});
    if (!draft) {
      printing.current = false;
      setMessage('There is nothing to print yet.');
      return;
    }
    let number: number | null = null;
    let createdAt = new Date().toISOString();
    if (settings.print.keepInArchive) {
      // A folio that cannot be kept (a full disk, say) is still printed.
      const kept = await keepFolio(draft).catch(() => null);
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

  const clearSheet = () => {
    shown.current = null;
    setSelected(null);
    setPrinted(false);
    setPreview(false);
    setHasSheet(false);
  };

  const show = (folio: Folio) => {
    cancelAnimationFrame(animation.current);
    shown.current = {draft: folio, number: folio.number, createdAt: folio.createdAt};
    setHasSheet(true);
    setSelected(folio.id);
    setConfirmDelete(null);
    setPreview(false);
    setPrinted(true);
    draw(1, 1);
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !shown.current) {
      return;
    }
    const name = shown.current.draft.title || 'Folio';
    const exported = await exportFolioImage(name, canvas.toDataURL('image/png'));
    setMessage(exported ? 'The page was saved as an image.' : '');
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
      clearSheet();
    }
    await refresh();
  };

  const toggleChoosing = () => {
    setChoosing(!choosing);
    setChosen([]);
    setConfirmBatch(false);
    setConfirmDelete(null);
  };

  const toggleChosen = (id: string) => {
    setConfirmBatch(false);
    setChosen(chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]);
  };

  const allChosen = folios.length > 0 && chosen.length === folios.length;

  const chooseAll = () => {
    setConfirmBatch(false);
    setChosen(allChosen ? [] : folios.map((folio) => folio.id));
  };

  const removeChosen = async () => {
    if (chosen.length === 0) {
      return;
    }
    if (!confirmBatch) {
      setConfirmBatch(true);
      return;
    }
    await Promise.all(chosen.map((id) => removeFolio(id)));
    if (selected && chosen.includes(selected)) {
      clearSheet();
    }
    setMessage(chosen.length === 1 ? 'One folio was deleted.' : `${chosen.length} folios were deleted.`);
    setChosen([]);
    setConfirmBatch(false);
    setChoosing(false);
    await refresh();
  };

  const startRename = (folio: Folio) => {
    renameTarget.current = folio.id;
    setRenaming(folio.id);
    setNewTitle(folio.title);
    setConfirmDelete(null);
  };

  const finishRename = async (folio: Folio, keep: boolean) => {
    if (renameTarget.current !== folio.id) {
      return;
    }
    renameTarget.current = null;
    setRenaming(null);
    if (!keep || newTitle === folio.title) {
      return;
    }
    const renamed = await renameFolio(folio.id, newTitle);
    if (renamed && selected === folio.id && shown.current) {
      shown.current = {...shown.current, draft: renamed};
      draw(1, 1);
    }
    await refresh();
  };

  const onRenameKey = (event: React.KeyboardEvent, folio: Folio) => {
    if (event.key === 'Enter') {
      void finishRename(folio, true);
    } else if (event.key === 'Escape') {
      // Leaves the Press open: Escape here only cancels the new name.
      event.stopPropagation();
      void finishRename(folio, false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  const takenLines = verseLines(taken).filter((line) => !line.stanzaBreak);
  const excerpt = takenLines
    .slice(0, 4)
    .map((line) => line.text)
    .join('\n');
  const note = source === 'snippet' ? null : SOURCE_NOTES[source];

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
            {note ? (
              <div className="tn-press-taken">
                <p className="tn-note">
                  {takenLines.length > 0 ? `${note.found}: ${takenLines.length} lines.` : note.empty}
                </p>
                {excerpt ? <pre className="tn-press-excerpt">{excerpt}</pre> : null}
              </div>
            ) : (
              <textarea
                className="tn-input tn-press-text"
                value={snippet}
                placeholder="Paste a code snippet, or print from the terminal's selection, screen or last command."
                aria-label="Text to print"
                spellCheck={false}
                autoFocus
                onChange={(event) => setSnippet(event.currentTarget.value)}
              />
            )}
            <details className="tn-press-options" open>
              <summary>Paper, seal and type</summary>
              <div className="tn-press-options-body">
                <Swatches
                  label="Paper"
                  value={style.paper}
                  options={PAPERS}
                  color={paperChip}
                  onChange={(paper) => changeStyle({paper})}
                />
                <Switch label="Wax seal" checked={style.seal} onChange={(seal) => changeStyle({seal})} />
                {style.seal ? (
                  <>
                    <div className="tn-press-seal">
                      <SealPreview style={style} />
                      <div className="tn-press-seal-options">
                        <Swatches
                          label="Wax"
                          value={style.sealColor}
                          options={SEALS}
                          color={waxChip}
                          onChange={(sealColor) => changeStyle({sealColor})}
                        />
                        <div className="tn-row">
                          <label className="tn-label" htmlFor="tn-monogram">
                            Monogram
                          </label>
                          <input
                            id="tn-monogram"
                            className="tn-input tn-monogram"
                            value={monogram}
                            maxLength={2}
                            spellCheck={false}
                            onChange={(event) => setMonogram(event.currentTarget.value)}
                            onBlur={commitTyped}
                            onKeyDown={(event) => event.key === 'Enter' && commitTyped()}
                          />
                        </div>
                      </div>
                    </div>
                    <Segmented
                      label="Emblem"
                      value={style.emblem}
                      options={EMBLEMS}
                      onChange={(emblem) => changeStyle({emblem})}
                    />
                    <Switch label="Silk ribbon" checked={style.ribbon} onChange={(ribbon) => changeStyle({ribbon})} />
                    {style.ribbon ? (
                      <RibbonChoices
                        value={style.ribbonStyle}
                        color={style.sealColor}
                        onChange={(ribbonStyle) => changeStyle({ribbonStyle})}
                      />
                    ) : null}
                  </>
                ) : null}
                <div className="tn-slider">
                  <div className="tn-slider-head">
                    <label className="tn-label" htmlFor="tn-folio-font">
                      Text face
                    </label>
                  </div>
                  <select
                    id="tn-folio-font"
                    className="tn-input"
                    value={style.font}
                    onChange={(event) => changeStyle({font: event.currentTarget.value as FolioFont})}
                  >
                    {FACES.map((face) => (
                      <option key={face.value} value={face.value}>
                        {face.label}
                      </option>
                    ))}
                  </select>
                  {style.font === 'custom' ? (
                    <input
                      className="tn-input"
                      value={customFont}
                      placeholder="Font family, e.g. Baskerville"
                      aria-label="Custom font family for the text"
                      spellCheck={false}
                      onChange={(event) => setCustomFont(event.currentTarget.value)}
                      onBlur={commitTyped}
                      onKeyDown={(event) => event.key === 'Enter' && commitTyped()}
                    />
                  ) : null}
                </div>
                <div className="tn-slider">
                  <div className="tn-slider-head">
                    <label className="tn-label" htmlFor="tn-signature">
                      Signed
                    </label>
                  </div>
                  <input
                    id="tn-signature"
                    className="tn-input"
                    value={signature}
                    maxLength={40}
                    placeholder="lamplight"
                    onChange={(event) => setSignature(event.currentTarget.value)}
                    onBlur={commitTyped}
                    onKeyDown={(event) => event.key === 'Enter' && commitTyped()}
                  />
                  <p className="tn-note">— set at the typewriter, by {style.signature || 'lamplight'}</p>
                </div>
              </div>
            </details>
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
            {folios.length > 0 ? (
              <div className="tn-archive-tools">
                <button type="button" className="tn-button" aria-pressed={choosing} onClick={toggleChoosing}>
                  {choosing ? 'Done' : 'Select'}
                </button>
                {choosing ? (
                  <button type="button" className="tn-button" onClick={chooseAll}>
                    {allChosen ? 'Select none' : 'Select all'}
                  </button>
                ) : null}
                {choosing ? (
                  <button
                    type="button"
                    className="tn-button tn-button-danger"
                    disabled={chosen.length === 0}
                    onClick={() => void removeChosen()}
                  >
                    {confirmBatch ? `Delete ${chosen.length}?` : `Delete (${chosen.length})`}
                  </button>
                ) : null}
              </div>
            ) : null}
            <ul className="tn-folios">
              {folios.map((folio) => (
                <li key={folio.id} className={selected === folio.id ? 'tn-folio tn-folio-selected' : 'tn-folio'}>
                  {choosing ? (
                    <input
                      type="checkbox"
                      className="tn-folio-check"
                      checked={chosen.includes(folio.id)}
                      aria-label={`Choose ${folio.title || 'Untitled'}`}
                      onChange={() => toggleChosen(folio.id)}
                    />
                  ) : null}
                  {renaming === folio.id ? (
                    <input
                      className="tn-input tn-folio-rename"
                      value={newTitle}
                      aria-label="New title"
                      autoFocus
                      onChange={(event) => setNewTitle(event.currentTarget.value)}
                      onKeyDown={(event) => onRenameKey(event, folio)}
                      onBlur={() => void finishRename(folio, true)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="tn-folio-open"
                      onClick={() => (choosing ? toggleChosen(folio.id) : show(folio))}
                    >
                      <span className="tn-folio-number">{toRoman(folio.number)}</span>
                      <span className="tn-folio-title">{folio.title || 'Untitled'}</span>
                      <span className="tn-folio-date">{new Date(folio.createdAt).toLocaleDateString()}</span>
                    </button>
                  )}
                  {choosing || renaming === folio.id ? null : (
                    <button
                      type="button"
                      className="tn-folio-action"
                      aria-label={`Rename ${folio.title || 'Untitled'}`}
                      title="Rename"
                      onClick={() => startRename(folio)}
                    >
                      ✎
                    </button>
                  )}
                  {choosing || renaming === folio.id ? null : (
                    <button type="button" className="tn-folio-delete" onClick={() => void remove(folio)}>
                      {confirmDelete === folio.id ? 'Delete?' : '×'}
                    </button>
                  )}
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
        {preview ? <p className="tn-press-badge">Preview · not yet printed</p> : null}
        <canvas ref={canvasRef} aria-label="The printed folio" hidden={!hasSheet} />
      </div>
    </aside>
  );
}
