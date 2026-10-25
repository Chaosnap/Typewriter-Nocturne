// Nocturne Studio: theme, paper, type, lamp and typewriter in one panel. Every control writes a
// validated settings patch; nothing here touches the terminal directly.

import React from 'react';

import {PAPER_IDS, PAPERS} from '../../../app/nocturne/papers';
import {applyLightingPreset} from '../../../app/nocturne/settings';
import {THEMES} from '../../../app/nocturne/themes';
import type {
  BeamShape,
  ClipFinish,
  CursorStyle,
  EffectQuality,
  FocusBackground,
  LightingPresetId,
  NocturneSettings,
  ScrollbarStyle,
  SelectionStyle,
  ThemeId,
  TypewriterVoice
} from '../../../app/nocturne/types';
import {getSettings, setSettings, updateSettings} from '../store';

import {percent, Section, Segmented, Slider, Switch} from './controls';
import {FontPicker} from './font-picker';

const THEME_IDS: ThemeId[] = ['paper-and-ink', 'midnight-study', 'moonlit-poetry'];

const PRESETS = [
  {value: 'off', label: 'Off'},
  {value: 'balanced', label: 'Balanced'},
  {value: 'cinematic', label: 'Cinematic'}
] as const;

const QUALITIES: readonly {value: EffectQuality; label: string}[] = [
  {value: 'auto', label: 'Auto'},
  {value: 'high', label: 'High'},
  {value: 'medium', label: 'Medium'},
  {value: 'low', label: 'Low'}
];

const VOICES: readonly {value: TypewriterVoice; label: string}[] = [
  {value: 'standard', label: 'Standard'},
  {value: 'portable', label: 'Portable'},
  {value: 'electric', label: 'Electric'},
  {value: 'whisper', label: 'Whisper'}
];

const BEAMS: readonly {value: BeamShape; label: string}[] = [
  {value: 'pointed', label: 'Pointed'},
  {value: 'soft', label: 'Soft'}
];

const SCROLLBARS: readonly {value: ScrollbarStyle; label: string}[] = [
  {value: 'clip', label: 'Paper clip'},
  {value: 'bar', label: 'Bar'},
  {value: 'native', label: 'System'}
];

const FINISHES: readonly {value: ClipFinish; label: string}[] = [
  {value: 'silver', label: 'Silver'},
  {value: 'brass', label: 'Brass'},
  {value: 'gold', label: 'Gold'},
  {value: 'black', label: 'Black'}
];

const CURSORS: readonly {value: CursorStyle; label: string}[] = [
  {value: 'quill', label: 'Quill'},
  {value: 'block', label: 'Block'},
  {value: 'bar', label: 'Bar'},
  {value: 'underline', label: 'Line'}
];

const SELECTIONS: readonly {value: SelectionStyle; label: string}[] = [
  {value: 'ink', label: 'Ink'},
  {value: 'classic', label: 'Classic'}
];

const FOCUS_BACKGROUNDS: readonly {value: FocusBackground; label: string}[] = [
  {value: 'paper', label: 'Paper'},
  {value: 'dark', label: 'Dark'},
  {value: 'custom', label: 'Custom'}
];

const degrees = (value: number) => `${Math.round(value)}°`;
const signedDegrees = (value: number) => (value > 0 ? `+${Math.round(value)}°` : degrees(value));
const pixels = (value: number) => `${value}px`;

type StudioProps = {
  settings: NocturneSettings;
  /** What the stage draws right now, e.g. "the full stage" or "the plain sheet (no usable GPU)". */
  drawing: string;
  onClose: () => void;
  onPress: () => void;
};

export function Studio({settings, drawing, onClose, onPress}: StudioProps) {
  const {lighting, typography, typewriter, paper, scrollbar, focus} = settings;
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
        <FontPicker typography={typography} onChange={type} />
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
        <Segmented
          label="Cursor"
          value={typography.cursorStyle}
          options={CURSORS}
          onChange={(cursorStyle) => updateSettings({typography: {cursorStyle}})}
        />
        <Segmented
          label="Selection"
          value={typography.selectionStyle}
          options={SELECTIONS}
          onChange={(selectionStyle) => updateSettings({typography: {selectionStyle}})}
        />
      </Section>

      <Section title="Scrollbar">
        <Segmented
          label="Style"
          value={scrollbar.style}
          options={SCROLLBARS}
          onChange={(style) => updateSettings({scrollbar: {style}})}
        />
        {scrollbar.style === 'clip' ? (
          <Segmented
            label="Finish"
            value={scrollbar.finish}
            options={FINISHES}
            onChange={(finish) => updateSettings({scrollbar: {finish}})}
          />
        ) : null}
        {scrollbar.style === 'bar' ? (
          <>
            <Slider
              label="Opacity"
              value={scrollbar.barOpacity}
              min={0.1}
              max={0.9}
              step={0.01}
              format={percent}
              onChange={(barOpacity) => updateSettings({scrollbar: {barOpacity}})}
            />
            <Slider
              label="Width"
              value={scrollbar.barWidth}
              min={3}
              max={12}
              step={1}
              format={pixels}
              onChange={(barWidth) => updateSettings({scrollbar: {barWidth}})}
            />
          </>
        ) : null}
      </Section>

      <Section title="Lamp">
        <Switch label="Lamp" checked={lighting.enabled} onChange={(enabled) => updateSettings({lighting: {enabled}})} />
        <Switch
          label="Pull cord"
          checked={settings.chrome.pullCord}
          onChange={(pullCord) => updateSettings({chrome: {pullCord}})}
        />
        <Segmented label="Preset" value={preset} options={PRESETS} onChange={choosePreset} />
        <Slider
          label="Brightness"
          value={lighting.intensity}
          min={0}
          max={2}
          step={0.01}
          format={percent}
          onChange={(intensity) => light({intensity})}
        />
        <Slider
          label="Beam angle"
          value={lighting.spread}
          min={20}
          max={160}
          step={1}
          format={degrees}
          onChange={(spread) => light({spread})}
        />
        <Segmented label="Beam" value={lighting.beam} options={BEAMS} onChange={(beam) => light({beam})} />
        <Slider
          label="Aim"
          value={lighting.aim}
          min={-45}
          max={45}
          step={1}
          format={signedDegrees}
          onChange={(aim) => light({aim})}
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

      <Section title="Press & Archive">
        <Switch
          label="Keep printed pages"
          checked={settings.print.keepInArchive}
          onChange={(keepInArchive) => updateSettings({print: {keepInArchive}})}
          note="Printed folios are kept as plain text in the archive folder of the configuration directory, on this computer only."
        />
        <button type="button" className="tn-button" onClick={onPress}>
          Open the Press…
        </button>
      </Section>

      <Section title="Quiet">
        <Switch label="Focus mode" checked={settings.focusMode} onChange={(focusMode) => updateSettings({focusMode})} />
        <Segmented
          label="Focus background"
          value={focus.background}
          options={FOCUS_BACKGROUNDS}
          onChange={(background) => updateSettings({focus: {background}})}
        />
        {focus.background === 'custom' ? (
          <div className="tn-row">
            <label className="tn-label" htmlFor="tn-focus-color">
              Colour
            </label>
            <input
              id="tn-focus-color"
              type="color"
              className="tn-color"
              value={focus.color}
              onChange={(event) => updateSettings({focus: {color: event.currentTarget.value}})}
            />
          </div>
        ) : null}
        <Switch
          label="Paper in focus mode"
          checked={focus.paper}
          onChange={(value) => updateSettings({focus: {paper: value}})}
        />
        <Switch
          label="Light in focus mode"
          checked={focus.lighting}
          onChange={(value) => updateSettings({focus: {lighting: value}})}
        />
        <Switch
          label="All visual effects"
          checked={settings.effects}
          onChange={(effects) => updateSettings({effects})}
          note="Light, glow, impressions and motion sit on top of the terminal and never touch its input or output."
        />
        <Segmented
          label="Quality"
          value={lighting.quality}
          options={QUALITIES}
          onChange={(quality) => updateSettings({lighting: {quality}})}
        />
        <p className="tn-note">
          Auto leaves out the typewriter and the light on computers without a usable GPU (virtual machines, remote
          desktops), where they would slow the terminal down.
        </p>
        <p className="tn-note">Now drawing {drawing}.</p>
      </Section>
    </aside>
  );
}
