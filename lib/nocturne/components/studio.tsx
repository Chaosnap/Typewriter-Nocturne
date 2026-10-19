// Nocturne Studio: theme, paper, type, lamp and typewriter in one panel. Every control writes a
// validated settings patch; nothing here touches the terminal directly.

import React from 'react';

import {PAPER_IDS, PAPERS} from '../../../app/nocturne/papers';
import {applyLightingPreset, FONTS} from '../../../app/nocturne/settings';
import {THEMES} from '../../../app/nocturne/themes';
import type {FontId, LightingPresetId, NocturneSettings, ThemeId, TypewriterVoice} from '../../../app/nocturne/types';
import {getSettings, setSettings, updateSettings} from '../store';

import {percent, Section, Segmented, Slider, Switch} from './controls';

const THEME_IDS: ThemeId[] = ['paper-and-ink', 'midnight-study', 'moonlit-poetry'];

const PRESETS = [
  {value: 'off', label: 'Off'},
  {value: 'balanced', label: 'Balanced'},
  {value: 'cinematic', label: 'Cinematic'}
] as const;

const VOICES: readonly {value: TypewriterVoice; label: string}[] = [
  {value: 'standard', label: 'Standard'},
  {value: 'portable', label: 'Portable'},
  {value: 'electric', label: 'Electric'},
  {value: 'whisper', label: 'Whisper'}
];

const degrees = (value: number) => `${Math.round(value)}°`;
const pixels = (value: number) => `${value}px`;

type StudioProps = {
  settings: NocturneSettings;
  onClose: () => void;
};

export function Studio({settings, onClose}: StudioProps) {
  const {lighting, typography, typewriter, paper} = settings;
  const light = (patch: Partial<NocturneSettings['lighting']>) =>
    updateSettings({lighting: {...patch, preset: 'custom'}});
  const type = (patch: Partial<NocturneSettings['typography']>) =>
    updateSettings({typography: {...patch, preset: 'custom'}});
  const preset = lighting.enabled ? lighting.preset : 'off';
  const choosePreset = (value: LightingPresetId | 'custom') => {
    if (value !== 'custom') {
      setSettings(applyLightingPreset(getSettings(), value));
    }
  };

  return (
    <aside className="tn-studio" aria-label="Nocturne Studio">
      <div className="tn-studio-head">
        <div>
          <div className="tn-eyebrow">Nocturne Studio</div>
          <h2>Light, Paper &amp; Ink</h2>
        </div>
        <button type="button" className="tn-close" aria-label="Close the Studio" onClick={onClose}>
          ×
        </button>
      </div>

      <Section title="Theme">
        <div className="tn-cards">
          {THEME_IDS.map((id) => {
            const theme = THEMES[id];
            const swatch = `linear-gradient(135deg, ${theme.palette.room} 50%, ${theme.light.color} 50%)`;
            return (
              <button
                key={id}
                type="button"
                className="tn-card"
                aria-pressed={settings.theme === id}
                onClick={() => updateSettings({theme: id})}
              >
                <span className="tn-card-swatch" style={{background: swatch}} />
                <span>{theme.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Paper & Ink">
        <div className="tn-cards">
          {PAPER_IDS.map((id) => {
            const sheet = PAPERS[id];
            const swatch = `linear-gradient(135deg, ${sheet.paper} 60%, ${sheet.ink} 60%)`;
            return (
              <button
                key={id}
                type="button"
                className="tn-card"
                aria-pressed={paper.style === id}
                onClick={() => updateSettings({paper: {style: id}})}
              >
                <span className="tn-card-swatch" style={{background: swatch}} />
                <span>{sheet.name}</span>
              </button>
            );
          })}
        </div>
        <Slider
          label="Texture depth"
          value={paper.texture}
          min={0}
          max={1.6}
          step={0.01}
          format={percent}
          onChange={(texture) => updateSettings({paper: {texture}})}
        />
        <Slider
          label="Type impression"
          value={typewriter.impression}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          onChange={(impression) => updateSettings({typewriter: {impression}})}
        />
      </Section>

      <Section title="Type">
        <div className="tn-slider">
          <div className="tn-slider-head">
            <label className="tn-label" htmlFor="tn-font">
              Typeface
            </label>
          </div>
          <select
            id="tn-font"
            className="tn-input"
            value={typography.font === 'custom' ? 'courier-prime' : typography.font}
            onChange={(event) => type({font: event.currentTarget.value as FontId})}
          >
            {FONTS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.bundled ? font.label : `${font.label} (if installed)`}
              </option>
            ))}
          </select>
        </div>
        <Slider
          label="Type size"
          value={typography.fontSize}
          min={11}
          max={22}
          step={0.5}
          format={pixels}
          onChange={(fontSize) => type({fontSize})}
        />
        <Slider
          label="Line spacing"
          value={typography.lineHeight}
          min={1.2}
          max={1.9}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(lineHeight) => type({lineHeight})}
        />
      </Section>

      <Section title="Lamp">
        <Switch label="Lamp" checked={lighting.enabled} onChange={(enabled) => updateSettings({lighting: {enabled}})} />
        <Segmented label="Preset" value={preset} options={PRESETS} onChange={choosePreset} />
        <Slider
          label="Intensity"
          value={lighting.intensity}
          min={0}
          max={2}
          step={0.01}
          format={percent}
          onChange={(intensity) => light({intensity})}
        />
        <Slider
          label="Spread"
          value={lighting.spread}
          min={20}
          max={160}
          step={1}
          format={degrees}
          onChange={(spread) => light({spread})}
        />
        <Slider
          label="Reach"
          value={lighting.reach}
          min={0.2}
          max={2}
          step={0.01}
          format={percent}
          onChange={(reach) => light({reach})}
        />
        <Slider
          label="Softness"
          value={lighting.softness}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          onChange={(softness) => light({softness})}
        />
        <Slider
          label="Dust in the beam"
          value={lighting.particles}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          onChange={(particles) => light({particles})}
        />
        <Slider
          label="Film grain"
          value={lighting.grain}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          onChange={(grain) => light({grain})}
        />
      </Section>

      <Section title="Typewriter">
        <Switch
          label="Machine"
          checked={typewriter.carriage}
          onChange={(carriage) => updateSettings({typewriter: {carriage}})}
        />
        <Switch label="Sound" checked={typewriter.sound} onChange={(sound) => updateSettings({typewriter: {sound}})} />
        <Slider
          label="Volume"
          value={typewriter.volume}
          min={0}
          max={1}
          step={0.01}
          format={percent}
          onChange={(volume) => updateSettings({typewriter: {volume}})}
        />
        <Segmented
          label="Voice"
          value={typewriter.voice}
          options={VOICES}
          onChange={(voice) => updateSettings({typewriter: {voice}})}
        />
        <Switch
          label="Margin bell"
          checked={typewriter.marginBell}
          onChange={(marginBell) => updateSettings({typewriter: {marginBell}})}
        />
      </Section>

      <Section title="Quiet">
        <Switch label="Focus mode" checked={settings.focusMode} onChange={(focusMode) => updateSettings({focusMode})} />
        <Switch
          label="All visual effects"
          checked={settings.effects}
          onChange={(effects) => updateSettings({effects})}
          note="Light, glow, impressions and motion sit on top of the terminal and never touch its input or output."
        />
      </Section>
    </aside>
  );
}
