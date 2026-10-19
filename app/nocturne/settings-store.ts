// Persists Nocturne settings in <config dir>/nocturne.json and shares them with every window.
//
// The renderer can only (1) read the current settings and (2) submit a complete settings object.
// Both directions go through sanitizeSettings(), so a malformed file or message can never inject
// unexpected values into CSS or terminal options. The file holds no secrets and no terminal data.

import {mkdirSync, readFileSync, renameSync, writeFileSync} from 'fs';
import {join} from 'path';

import {BrowserWindow, ipcMain} from 'electron';

import {cfgDir} from '../config/paths';

import {CHANNELS} from './channels';
import {sanitizeSettings, settingsEqual} from './settings';
import type {NocturneSettings} from './types';

export const SETTINGS_FILE = 'nocturne.json';

let current: NocturneSettings | null = null;

const settingsPath = () => join(cfgDir, SETTINGS_FILE);

function load(): NocturneSettings {
  try {
    return sanitizeSettings(JSON.parse(readFileSync(settingsPath(), 'utf8')));
  } catch {
    // Missing or unreadable file: start from defaults. Never log the file contents.
    return sanitizeSettings(undefined);
  }
}

function save(settings: NocturneSettings) {
  mkdirSync(cfgDir, {recursive: true});
  const target = settingsPath();
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  renameSync(temporary, target);
}

export function getNocturneSettings(): NocturneSettings {
  if (!current) {
    current = load();
  }
  return current;
}

export function registerNocturneSettings() {
  ipcMain.on(CHANNELS.read, (event) => {
    event.returnValue = getNocturneSettings();
  });

  ipcMain.handle(CHANNELS.write, (event, raw: unknown) => {
    const previous = getNocturneSettings();
    const next = sanitizeSettings(raw, previous);
    if (settingsEqual(next, previous)) {
      return next;
    }
    current = next;
    try {
      save(next);
    } catch (error) {
      console.error('Could not save Nocturne settings:', (error as Error).message);
    }
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents !== event.sender) {
        win.webContents.send(CHANNELS.changed, next);
      }
    }
    return next;
  });
}
