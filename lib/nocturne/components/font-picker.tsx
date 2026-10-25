// Typeface choice: the bundled faces, Nerd Font builds of popular faces, or any font installed on
// the computer. A custom family is validated against a safe font-family grammar before it reaches
// CSS or xterm.js.

import React, {useState} from 'react';

import {FONTS, isSafeFontFamily} from '../../../app/nocturne/settings';
import type {FontId, TypographySettings} from '../../../app/nocturne/types';

const SUGGESTIONS = [
  'JetBrainsMono Nerd Font Mono',
  'FiraCode Nerd Font Mono',
  'Hack Nerd Font Mono',
  'Iosevka Nerd Font',
  'MesloLGM Nerd Font',
  'Cascadia Code',
  'Source Code Pro',
  'SF Mono',
  'Menlo',
  'Consolas',
  'Ubuntu Mono',
  'Sarasa Mono SC',
  'LXGW WenKai Mono'
];

/** The Local Font Access API (Chromium); not yet in TypeScript's DOM typings. */
type FontAccess = {queryLocalFonts?: () => Promise<{family: string}[]>};

type FontPickerProps = {
  typography: TypographySettings;
  onChange: (patch: Partial<TypographySettings>) => void;
};

export function FontPicker({typography, onChange}: FontPickerProps) {
  const [draft, setDraft] = useState(typography.customFamily);
  const [installed, setInstalled] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const custom = typography.font === 'custom';

  const applyCustom = () => {
    const family = draft.trim();
    if (!family) {
      setStatus('');
      return;
    }
    if (!isSafeFontFamily(family)) {
      setStatus('Use letters, digits, spaces, quotes, commas, dots and dashes only.');
      return;
    }
    setStatus('');
    onChange({font: 'custom', customFamily: family});
  };

  const findInstalled = async () => {
    const access = window as unknown as FontAccess;
    if (!access.queryLocalFonts) {
      setStatus('This system does not list its fonts; type the family name instead.');
      return;
    }
    try {
      const fonts = await access.queryLocalFonts();
      const families = Array.from(new Set(fonts.map((font) => font.family))).filter((name) => isSafeFontFamily(name));
      setInstalled(families.sort((a, b) => a.localeCompare(b)));
      setStatus(`${families.length} installed families. Start typing to pick one.`);
    } catch {
      setStatus('Listing installed fonts was not allowed; type the family name instead.');
    }
  };

  const options = Array.from(new Set([...installed, ...SUGGESTIONS]));

  return (
    <div className="tn-slider">
      <div className="tn-slider-head">
        <label className="tn-label" htmlFor="tn-font">
          Typeface
        </label>
      </div>
      <select
        id="tn-font"
        className="tn-input"
        value={typography.font}
        onChange={(event) => onChange({font: event.currentTarget.value as FontId})}
      >
        {FONTS.map((font) => (
          <option key={font.id} value={font.id}>
            {font.bundled ? font.label : `${font.label} (if installed)`}
          </option>
        ))}
        <option value="custom">Custom font…</option>
      </select>
      {custom ? (
        <div className="tn-font-custom">
          <input
            className="tn-input"
            list="tn-font-families"
            value={draft}
            placeholder="Font family, e.g. Iosevka Nerd Font"
            aria-label="Custom font family"
            spellCheck={false}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={applyCustom}
            onKeyDown={(event) => event.key === 'Enter' && applyCustom()}
          />
          <datalist id="tn-font-families">
            {options.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button type="button" className="tn-button" onClick={() => void findInstalled()}>
            Find installed fonts
          </button>
        </div>
      ) : null}
      {status ? <p className="tn-note">{status}</p> : null}
      <p className="tn-note">Nerd Font icons are bundled and appear with every typeface.</p>
    </div>
  );
}
