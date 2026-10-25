// The renderer's side of the Archive. Everything goes through the main process (archive-store.ts),
// which validates it; replies are validated again here.

import {ipcRenderer} from 'electron';

import {ARCHIVE_CHANNELS} from '../../../app/nocturne/channels';
import {sanitizeFolio} from '../../../app/nocturne/folio';
import type {Folio, FolioDraft} from '../../../app/nocturne/folio';

export async function listFolios(): Promise<Folio[]> {
  const raw: unknown = await ipcRenderer.invoke(ARCHIVE_CHANNELS.list);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => sanitizeFolio(item)).filter((item): item is Folio => item !== null);
}

export async function keepFolio(draft: FolioDraft): Promise<Folio | null> {
  const raw: unknown = await ipcRenderer.invoke(ARCHIVE_CHANNELS.save, draft);
  return sanitizeFolio(raw);
}

export async function removeFolio(id: string): Promise<boolean> {
  const raw: unknown = await ipcRenderer.invoke(ARCHIVE_CHANNELS.remove, id);
  return raw === true;
}

/** Asks where to save the page and writes the PNG there. `dataUrl` comes from canvas.toDataURL(). */
export async function exportFolioImage(name: string, dataUrl: string): Promise<boolean> {
  const data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const raw: unknown = await ipcRenderer.invoke(ARCHIVE_CHANNELS.exportImage, {name, data});
  return raw === true;
}

export async function revealArchive(): Promise<boolean> {
  const raw: unknown = await ipcRenderer.invoke(ARCHIVE_CHANNELS.reveal);
  return raw === true;
}
