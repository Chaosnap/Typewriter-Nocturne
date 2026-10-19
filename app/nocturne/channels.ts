// IPC channel names for Nocturne settings. Kept in a dependency-free module because both the
// main process and the renderer bundle import it.

export const CHANNELS = {
  read: 'nocturne:settings:read',
  write: 'nocturne:settings:write',
  changed: 'nocturne:settings:changed'
} as const;
