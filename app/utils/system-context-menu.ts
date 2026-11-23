import {execFile} from 'child_process';
import {existsSync} from 'fs';
import {dirname, join} from 'path';

import * as Registry from 'native-reg';
import type {HKEY} from 'native-reg';

import notify from '../notify';

const appPath = `"${process.execPath}"`;
const regKeys = [
  `Software\\Classes\\Directory\\Background\\shell\\TypewriterNocturne`,
  `Software\\Classes\\Directory\\shell\\TypewriterNocturne`,
  `Software\\Classes\\Drive\\shell\\TypewriterNocturne`
];
const regParts = [
  {key: 'command', name: '', value: `${appPath} "%V"`},
  {name: '', value: 'Open TypeNoc &here'},
  {name: 'Icon', value: `${appPath}`}
];

function addValues(hyperKey: HKEY, commandKey: HKEY) {
  try {
    Registry.setValueSZ(hyperKey, regParts[1].name, regParts[1].value);
  } catch (error) {
    console.error(error);
  }
  try {
    Registry.setValueSZ(hyperKey, regParts[2].name, regParts[2].value);
  } catch (err) {
    console.error(err);
  }
  try {
    Registry.setValueSZ(commandKey, regParts[0].name, regParts[0].value);
  } catch (err_) {
    console.error(err_);
  }
}

// [nocturne] "Open TypeNoc here" at the top level of the Windows 11 menu needs a packaged
// IExplorerCommand handler (build/win/context-menu). It is registered from the signed package when
// the build has one, or else in place, which Windows allows in Developer Mode only. The registry
// entries above stay in either case, under "Show more options".
const packageDir = join(process.resourcesPath, 'context-menu');
const installDir = dirname(process.execPath);
const PACKAGE_NAME = 'TypewriterNocturne.ContextMenu';

const quote = (path: string) => `'${path.replace(/'/g, "''")}'`;

function powershell(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command];
    execFile('powershell.exe', args, {windowsHide: true}, (error) => {
      if (error) {
        console.error(error.message);
      }
      resolve(!error);
    });
  });
}

async function addPackage() {
  const signed = join(packageDir, 'TypeNocContextMenu.msix');
  const manifest = join(packageDir, 'AppxManifest.xml');
  if (existsSync(signed)) {
    return powershell(`Add-AppxPackage -Path ${quote(signed)} -ExternalLocation ${quote(installDir)}`);
  }
  if (existsSync(manifest)) {
    return powershell(`Add-AppxPackage -Register ${quote(manifest)} -ExternalLocation ${quote(installDir)}`);
  }
  return false;
}

const removePackage = () => powershell(`Get-AppxPackage ${PACKAGE_NAME} | Remove-AppxPackage`);

export const add = () => {
  addRegistryEntries();
  void addPackage().then((added) => {
    if (added) {
      notify('Open TypeNoc here', 'Added to the File Explorer context menu.');
    } else {
      notify(
        'Open TypeNoc here',
        'Added under "Show more options". The Windows 11 menu itself needs a signed build or Developer Mode.'
      );
    }
  });
};

export const remove = () => {
  removeRegistryEntries();
  void removePackage().then(() => notify('Open TypeNoc here', 'Removed from the File Explorer context menu.'));
};

function addRegistryEntries() {
  regKeys.forEach((regKey) => {
    try {
      const hyperKey =
        Registry.openKey(Registry.HKCU, regKey, Registry.Access.ALL_ACCESS) ||
        Registry.createKey(Registry.HKCU, regKey, Registry.Access.ALL_ACCESS);
      const commandKey =
        Registry.openKey(Registry.HKCU, `${regKey}\\${regParts[0].key}`, Registry.Access.ALL_ACCESS) ||
        Registry.createKey(Registry.HKCU, `${regKey}\\${regParts[0].key}`, Registry.Access.ALL_ACCESS);
      addValues(hyperKey, commandKey);
      Registry.closeKey(hyperKey);
      Registry.closeKey(commandKey);
    } catch (error) {
      console.error(error);
    }
  });
}

function removeRegistryEntries() {
  regKeys.forEach((regKey) => {
    try {
      Registry.deleteTree(Registry.HKCU, regKey);
    } catch (err) {
      console.error(err);
    }
  });
}
