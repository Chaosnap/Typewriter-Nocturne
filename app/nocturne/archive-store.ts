// The Archive: printed folios kept as small JSON files in <config dir>/archive/.
//
// Only plain text of bounded size is written (sanitizeDraft), file names are generated here from
// random ids (never from renderer input), and a folio is only ever read back and drawn. Nothing
// leaves the computer: exporting an image asks the user where to save it.

import {randomBytes} from 'crypto';
import {mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync} from 'fs';
import {join} from 'path';

import {app, BrowserWindow, dialog, ipcMain, shell} from 'electron';
import type {WebContents} from 'electron';

import {cfgDir} from '../config/paths';

import {ARCHIVE_CHANNELS} from './channels';
import {isFolioId, sanitizeDraft, sanitizeFolio, sanitizeTitle} from './folio';
import type {Folio} from './folio';

const MAX_FOLIOS = 500;
/** An exported page is a PNG of a few megabytes at most. */
const MAX_IMAGE_BYTES = 24 * 1024 * 1024;

const archiveDir = () => join(cfgDir, 'archive');

function readAll(): Folio[] {
  let names: string[] = [];
  try {
    names = readdirSync(archiveDir()).filter((name) => name.endsWith('.json'));
  } catch {
    return [];
  }
  const folios: Folio[] = [];
  for (const name of names) {
    try {
      const folio = sanitizeFolio(JSON.parse(readFileSync(join(archiveDir(), name), 'utf8')));
      if (folio && `${folio.id}.json` === name) {
        folios.push(folio);
      }
    } catch {
      // An unreadable file is skipped; its contents are never logged.
    }
  }
  return folios.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_FOLIOS);
}

function save(raw: unknown): Folio | null {
  const draft = sanitizeDraft(raw);
  if (!draft) {
    return null;
  }
  const existing = readAll();
  const folio: Folio = {
    ...draft,
    id: `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
    number: existing.reduce((highest, item) => Math.max(highest, item.number), 0) + 1,
    createdAt: new Date().toISOString()
  };
  write(folio);
  return folio;
}

function write(folio: Folio) {
  mkdirSync(archiveDir(), {recursive: true});
  const target = join(archiveDir(), `${folio.id}.json`);
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(folio, null, 2)}\n`, 'utf8');
  renameSync(temporary, target);
}

/** Gives a kept folio a new title; nothing else about it changes. */
function rename(raw: unknown): Folio | null {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  if (!isFolioId(value.id)) {
    return null;
  }
  let folio: Folio | null = null;
  try {
    folio = sanitizeFolio(JSON.parse(readFileSync(join(archiveDir(), `${value.id}.json`), 'utf8')));
  } catch {
    return null;
  }
  if (!folio || folio.id !== value.id) {
    return null;
  }
  const renamed = {...folio, title: sanitizeTitle(value.title)};
  write(renamed);
  return renamed;
}

function remove(id: unknown): boolean {
  if (!isFolioId(id)) {
    return false;
  }
  try {
    unlinkSync(join(archiveDir(), `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

const safeFileName = (value: unknown) => {
  const name = typeof value === 'string' ? value.replace(/[^\p{L}\p{N} ._-]+/gu, ' ').trim() : '';
  return `${(name || 'Folio').slice(0, 80)}.png`;
};

async function exportImage(sender: WebContents, raw: unknown): Promise<boolean> {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const data = typeof value.data === 'string' ? value.data : '';
  if (!/^[A-Za-z0-9+/]+=*$/.test(data) || data.length > (MAX_IMAGE_BYTES * 4) / 3) {
    return false;
  }
  const image = Buffer.from(data, 'base64');
  // PNG signature: the renderer may only hand over an image.
  if (image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return false;
  }
  const owner = BrowserWindow.fromWebContents(sender);
  const options = {
    defaultPath: join(app.getPath('documents'), safeFileName(value.name)),
    filters: [{name: 'PNG image', extensions: ['png']}]
  };
  const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) {
    return false;
  }
  writeFileSync(result.filePath, image);
  return true;
}

export function registerNocturneArchive() {
  ipcMain.handle(ARCHIVE_CHANNELS.list, () => readAll());
  ipcMain.handle(ARCHIVE_CHANNELS.save, (_event, raw: unknown) => save(raw));
  ipcMain.handle(ARCHIVE_CHANNELS.remove, (_event, id: unknown) => remove(id));
  ipcMain.handle(ARCHIVE_CHANNELS.rename, (_event, raw: unknown) => rename(raw));
  ipcMain.handle(ARCHIVE_CHANNELS.exportImage, (event, raw: unknown) => exportImage(event.sender, raw));
  ipcMain.handle(ARCHIVE_CHANNELS.reveal, async () => {
    mkdirSync(archiveDir(), {recursive: true});
    return (await shell.openPath(archiveDir())) === '';
  });
}
