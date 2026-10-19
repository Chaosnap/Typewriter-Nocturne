// Renderer-side Nocturne settings store.
//
// A tiny external store (no Redux) so that dragging a Lighting Studio slider re-renders only
// the components that read the settings, never the terminal tree. Changes are saved to the main
// process (debounced) and broadcast by it to the other windows.

import {ipcRenderer} from 'electron';
import {useSyncExternalStore} from 'react';

import {CHANNELS} from '../../app/nocturne/channels';
import {defaultSettings, patchSettings, sanitizeSettings, settingsEqual} from '../../app/nocturne/settings';
import type {NocturneSettings, SettingsPatch} from '../../app/nocturne/types';

type Listener = () => void;

const listeners = new Set<Listener>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function readInitial(): NocturneSettings {
  try {
    return sanitizeSettings(ipcRenderer.sendSync(CHANNELS.read) as unknown);
  } catch {
    return defaultSettings();
  }
}

let current: NocturneSettings = readInitial();

const emit = () => listeners.forEach((listener) => listener());

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ipcRenderer.invoke(CHANNELS.write, current).catch((error: Error) => {
      console.error('Could not save Nocturne settings:', error.message);
    });
  }, 250);
}

export const getSettings = () => current;

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSettings(next: NocturneSettings) {
  const valid = sanitizeSettings(next, current);
  if (settingsEqual(valid, current)) {
    return;
  }
  current = valid;
  emit();
  scheduleSave();
}

export function updateSettings(patch: SettingsPatch) {
  setSettings(patchSettings(current, patch));
}

ipcRenderer.on(CHANNELS.changed, (_event, raw: unknown) => {
  const next = sanitizeSettings(raw, current);
  if (!settingsEqual(next, current)) {
    current = next;
    emit();
  }
});

/** React hook: the whole settings object, re-rendering when it changes. */
export function useNocturneSettings(): NocturneSettings {
  return useSyncExternalStore(subscribe, getSettings);
}
