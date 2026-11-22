import test from 'ava';

import {launchDirectory} from '../../app/utils/launch-directory';

const folders = new Set(['C:\\', 'D:\\Projects\\poem', '/home/ada/poems', '/tmp/x']);
const windows = {platform: 'win32' as const, defaultApp: false, isDirectory: (path: string) => folders.has(path)};
const linux = {platform: 'linux' as const, defaultApp: false, isDirectory: (path: string) => folders.has(path)};

test('Explorer passes the folder as the first argument', (t) => {
  t.is(launchDirectory(['Typewriter Nocturne.exe', 'D:\\Projects\\poem'], windows), 'D:\\Projects\\poem');
});

test('a drive root arrives as C:" and still opens there', (t) => {
  t.is(launchDirectory(['Typewriter Nocturne.exe', 'C:"'], windows), 'C:\\');
  t.is(launchDirectory(['Typewriter Nocturne.exe', '--cwd=C:"'], windows), 'C:\\');
});

test('switches are skipped and --cwd wins', (t) => {
  t.is(launchDirectory(['nocturne', '--no-sandbox', '/home/ada/poems'], linux), '/home/ada/poems');
  t.is(launchDirectory(['nocturne', '/home/ada/poems', '--cwd=/tmp/x'], linux), '/tmp/x');
});

test('nothing, relative paths and missing folders fall back to the default', (t) => {
  t.is(launchDirectory(['nocturne'], linux), undefined);
  t.is(launchDirectory(['nocturne', 'poems'], linux), undefined);
  t.is(launchDirectory(['nocturne', '/no/such/folder'], linux), undefined);
  t.is(launchDirectory(['electron', '.'], {...linux, defaultApp: true}), undefined);
});
