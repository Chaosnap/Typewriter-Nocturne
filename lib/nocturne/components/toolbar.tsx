// The small brass tools at the top right of the stage: lamp, typewriter sound, focus mode and the
// Studio. Each is also a command (View menu and keyboard shortcuts).

import React from 'react';

import type {NocturneSettings} from '../../../app/nocturne/types';
import {updateSettings} from '../store';

import {BellIcon, FocusIcon, LampIcon, StudioIcon} from './icons';

type ToolbarProps = {
  settings: NocturneSettings;
  studioOpen: boolean;
  onStudio: () => void;
};

type ToolProps = {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

/** Clicking a tool must not take keyboard focus away from the terminal. */
const keepTerminalFocus = (event: React.MouseEvent) => event.preventDefault();

function Tool({label, pressed, onClick, children}: ToolProps) {
  return (
    <button
      type="button"
      className="tn-tool"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseDown={keepTerminalFocus}
    >
      {children}
    </button>
  );
}

export function Toolbar({settings, studioOpen, onStudio}: ToolbarProps) {
  const {lighting, typewriter, focusMode} = settings;
  return (
    <div className="tn-tools" role="toolbar" aria-label="Typewriter Nocturne">
      <Tool
        label="Lamp on / off"
        pressed={lighting.enabled}
        onClick={() => updateSettings({lighting: {enabled: !lighting.enabled}})}
      >
        <LampIcon />
      </Tool>
      <Tool
        label="Typewriter sound on / off"
        pressed={typewriter.sound}
        onClick={() => updateSettings({typewriter: {sound: !typewriter.sound}})}
      >
        <BellIcon muted={!typewriter.sound} />
      </Tool>
      <Tool label="Focus mode" pressed={focusMode} onClick={() => updateSettings({focusMode: !focusMode})}>
        <FocusIcon />
      </Tool>
      <Tool label="Nocturne Studio" pressed={studioOpen} onClick={onStudio}>
        <StudioIcon />
      </Tool>
    </div>
  );
}
