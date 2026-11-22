// [nocturne] The folder the app was asked to open in: from Explorer's "Open TypeNoc here", the
// `nocturne` command or a shortcut. It comes either as `--cwd=<folder>` or as the first argument
// that is not a switch (Chromium and Electron switches start with "-"). A folder that does not
// exist, or a relative path, is ignored, so the shell then starts in the configured
// `workingDirectory` or the home folder, never somewhere unexpected.

import {statSync} from 'fs';
import {posix, win32} from 'path';

export type LaunchOptions = {
  platform: NodeJS.Platform;
  /** `electron .` during development: the app's own path comes before the arguments. */
  defaultApp: boolean;
  isDirectory: (path: string) => boolean;
};

const CWD_FLAG = /^--(?:cwd|working-directory)=(.*)$/;

export function launchDirectory(argv: readonly string[], options: LaunchOptions): string | undefined {
  const paths = options.platform === 'win32' ? win32 : posix;
  const args = argv.slice(options.defaultApp ? 2 : 1);
  let candidate: string | undefined;
  for (const arg of args) {
    const flag = CWD_FLAG.exec(arg);
    if (flag) {
      candidate = flag[1];
      break;
    }
  }
  if (candidate === undefined) {
    candidate = args.find((arg) => arg !== '' && !arg.startsWith('-'));
  }
  if (!candidate) {
    return undefined;
  }
  if (options.platform === 'win32') {
    // Explorer passes a drive as "C:\"; the backslash escapes the closing quote, which arrives as
    // `C:"`. Quotes cannot be part of a Windows path, so any left over are dropped.
    candidate = candidate.replace(/^([a-zA-Z]:)"$/, '$1\\').replace(/"/g, '');
  }
  if (!paths.isAbsolute(candidate)) {
    return undefined;
  }
  const folder = paths.normalize(candidate);
  return options.isDirectory(folder) ? folder : undefined;
}

/** Whether a path is an existing folder. */
export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
