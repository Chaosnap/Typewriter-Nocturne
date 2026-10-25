// IPC channel names for Nocturne settings and the Archive. Kept in a dependency-free module because
// both the main process and the renderer bundle import it.

export const CHANNELS = {
  read: 'nocturne:settings:read',
  write: 'nocturne:settings:write',
  changed: 'nocturne:settings:changed'
} as const;

export const ARCHIVE_CHANNELS = {
  list: 'nocturne:archive:list',
  save: 'nocturne:archive:save',
  remove: 'nocturne:archive:remove',
  rename: 'nocturne:archive:rename',
  exportImage: 'nocturne:archive:export-image',
  reveal: 'nocturne:archive:reveal'
} as const;
