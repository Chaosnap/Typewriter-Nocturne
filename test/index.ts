// End-to-end smoke test of the packaged application.
//
// Launches the unpacked build produced by electron-builder with an isolated
// configuration directory, then drives a real shell through the real PTY and
// reads the result back from xterm.js' accessibility tree. Screenshots of the
// rendered window are written to dist/tmp/ and uploaded by CI.

// Native
import os from 'os';
import path from 'path';

// Packages
import test from 'ava';
import fs from 'fs-extra';
import {_electron} from 'playwright';
import type {ElectronApplication, Page} from 'playwright';

const isWindows = process.platform === 'win32';

let app: ElectronApplication;
let page: Page;

const pathToBinary = () => {
  switch (process.platform) {
    case 'linux':
      return path.join(__dirname, '../dist/linux-unpacked/typewriter-nocturne');
    case 'darwin': {
      const dir = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
      return path.join(__dirname, `../dist/${dir}/Typewriter Nocturne.app/Contents/MacOS/Typewriter Nocturne`);
    }
    case 'win32':
      return path.join(__dirname, '../dist/win-unpacked/Typewriter Nocturne.exe');
    default:
      throw new Error('Path to the built binary needs to be defined for this platform in test/index.ts');
  }
};

const writeTestConfig = () => {
  const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'nocturne-e2e-'));
  const configDir = path.join(configHome, 'TypewriterNocturne');
  fs.mkdirpSync(configDir);
  fs.writeJSONSync(path.join(configDir, 'hyper.json'), {
    config: {
      // Renders terminal rows into the DOM so the test can read real output.
      screenReaderMode: true,
      windowSize: [1280, 820],
      shell: isWindows ? 'powershell.exe' : '/bin/bash',
      shellArgs: isWindows ? ['-NoLogo', '-NoProfile'] : ['--noprofile', '--norc'],
      env: isWindows ? {} : {PS1: '$ ', LC_ALL: process.platform === 'darwin' ? 'en_US.UTF-8' : 'C.UTF-8'}
    },
    plugins: [],
    localPlugins: [],
    keymaps: {}
  });
  return configHome;
};

const screenshot = async (name: string) => {
  const image = await app.evaluate(({BrowserWindow}) =>
    BrowserWindow.getAllWindows()[0]
      ?.capturePage()
      .then((img) => img.toPNG().toString('base64'))
  );
  if (image) {
    await fs.mkdirp('dist/tmp');
    await fs.writeFile(`dist/tmp/${process.platform}_${name}.png`, Buffer.from(image, 'base64'));
  }
};

/** Sends Nocturne settings to the window as the main process does when another window saves them. */
const setNocturne = (settings: Record<string, unknown>) =>
  app.evaluate(({BrowserWindow}, value) => {
    BrowserWindow.getAllWindows()[0].webContents.send('nocturne:settings:changed', value);
  }, settings);

const nocturneCommand = (name: string) =>
  app.evaluate(({BrowserWindow}, value) => {
    BrowserWindow.getAllWindows()[0].webContents.send('nocturne:command', value);
  }, name);

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until the typewriter model has been drawn (its shaders compiled) and the type head has come
 * to rest after the last change. CI runners draw on the CPU, so this can take several seconds.
 */
const waitForMachine = async (timeoutMs: number) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('.tn-stage');
      return `${stage?.dataset.machine}/${stage?.dataset.motion}`;
    });
    if (state === 'drawn/still') {
      return true;
    }
    await pause(500);
  }
  return false;
};

const terminalText = () =>
  page.evaluate(() => {
    const tree = document.querySelector('.term_active .xterm-accessibility-tree');
    return tree ? tree.textContent || '' : '';
  });

const waitForText = async (needle: string | RegExp, timeoutMs = 20000) => {
  const started = Date.now();
  let text = '';
  while (Date.now() - started < timeoutMs) {
    text = await terminalText();
    if (typeof needle === 'string' ? text.includes(needle) : needle.test(text)) {
      return text;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${String(needle)}. Terminal text was:\n${text}`);
};

const run = async (command: string) => {
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
};

test.before(async () => {
  const configHome = writeTestConfig();
  app = await _electron.launch({
    executablePath: pathToBinary(),
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    env: {...process.env, XDG_CONFIG_HOME: configHome}
  });
  page = await app.firstWindow();
  await page.waitForSelector('.tn-nocturne .tn-stage', {timeout: 30000});
  await page.waitForSelector('.term_active .xterm', {timeout: 30000});
  await page.waitForSelector('.term_active .xterm-accessibility-tree', {timeout: 30000});
  // Give the shell a moment to print its prompt.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await page.click('.term_active .xterm');
});

test.after.always(async () => {
  if (app) {
    await screenshot('final').catch(() => undefined);
    await app.close();
  }
});

test.serial('dev tools are closed', async (t) => {
  t.false(await app.evaluate(({webContents}) => !!webContents.getFocusedWebContents()?.isDevToolsOpened()));
});

test.serial('a real shell echoes command output through the PTY', async (t) => {
  await run(isWindows ? 'Write-Output ("nocturne-" + 6*7)' : 'echo "nocturne-$((6*7))"');
  const text = await waitForText('nocturne-42');
  t.true(text.includes('nocturne-42'));
  await screenshot('echo');
});

test.serial('exit codes come from the shell, not the terminal', async (t) => {
  if (isWindows) {
    await run('cmd /c exit 3; Write-Output ("exit-code-" + $LASTEXITCODE)');
  } else {
    await run('(exit 3); echo "exit-code-$?"');
  }
  t.truthy(await waitForText('exit-code-3'));
});

test.serial('CJK wide characters render from program output', async (t) => {
  // UTF-8 octal escapes keep the command itself ASCII; the shell prints 纸与墨.
  if (isWindows) {
    await run('Write-Output ([string][char]0x7EB8 + [char]0x4E0E + [char]0x58A8 + "-out")');
  } else {
    await run("printf '\\347\\272\\270\\344\\270\\216\\345\\242\\250-out\\n'");
  }
  t.truthy(await waitForText('纸与墨-out'));
  await screenshot('cjk');
});

test.serial('pasting CJK text reaches the shell intact', async (t) => {
  if (isWindows) {
    t.pass('Covered by the manual acceptance checklist on Windows (console code page).');
    return;
  }
  await app.evaluate(({clipboard}) => clipboard.writeText('echo "纸与墨-paste"'));
  // Same call the Edit → Paste menu role makes; it exercises xterm's paste and bracketed-paste path.
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.paste());
  await page.keyboard.press('Enter');
  t.truthy(await waitForText(/纸与墨-paste[\s\S]*纸与墨-paste/));
});

test.serial('typing through an input method strikes keys and reaches the shell intact', async (t) => {
  const strikes = () =>
    page.evaluate(() => Number(document.querySelector<HTMLElement>('.tn-stage')?.dataset.keys ?? 0));
  const before = await strikes();
  await page.keyboard.type('echo ');
  // The same events an input method produces: a growing preedit text, then the committed text.
  const cdp = await page.context().newCDPSession(page);
  for (const text of ['n', 'ni', 'nih', 'niha', 'nihao']) {
    await cdp.send('Input.imeSetComposition', {text, selectionStart: text.length, selectionEnd: text.length});
  }
  await cdp.send('Input.insertText', {text: '你好'});
  await page.keyboard.press('Enter');
  await pause(500);
  const struck = (await strikes()) - before;
  // echo + space (5), five preedit changes, the return; the commit counts when the IME reports it.
  t.true(struck >= 11, `keys struck: ${struck}`);
  if (!isWindows) {
    t.truthy(await waitForText(/echo 你好[\s\S]*你好/));
  }
});

test.serial('pulling the lamp cord switches the lamp', async (t) => {
  const pressed = () => page.getAttribute('.tn-cord', 'aria-pressed');
  const before = await pressed();
  const box = await page.locator('.tn-cord').boundingBox();
  t.truthy(box, 'the cord is on screen');
  if (!box) {
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + 110);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + 110 + i * 8);
  }
  await page.mouse.up();
  await pause(300);
  t.not(await pressed(), before);
  // A click on the pull switches it back.
  await page.click('.tn-cord', {position: {x: box.width / 2, y: 110}});
  await pause(300);
  t.is(await pressed(), before);
  await page.click('.term_active .xterm');
});

test.serial('resizing the window resizes the PTY', async (t) => {
  const readCols = async (marker: string) => {
    await run(isWindows ? `Write-Output ("${marker}-" + [Console]::WindowWidth)` : `echo "${marker}-$(tput cols)"`);
    const text = await waitForText(new RegExp(`${marker}-\\d+`));
    const matches = [...text.matchAll(new RegExp(`${marker}-(\\d+)`, 'g'))];
    return Number(matches[matches.length - 1][1]);
  };

  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(820, 560));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const narrow = await readCols('cols-narrow');

  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(1280, 760));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const wide = await readCols('cols-wide');

  t.true(wide > narrow, `expected more columns after widening (narrow=${narrow}, wide=${wide})`);
  await screenshot('resized');
});

const SNIPPET = [
  "// Shall I compare thee to a summer's day?",
  'function leaves(tree, depth = 0) {',
  '  if (!tree.children.length) {',
  '    return [tree.name];',
  '  }',
  '  return tree.children.flatMap((child) => leaves(child, depth + 1));',
  '}',
  '',
  'const verse = leaves(oak).map((leaf, i) => `${i + 1}. ${leaf}`);',
  "console.log(verse.join('\\n'));"
].join('\n');

const LOOKS: [string, Record<string, unknown>][] = [
  ['paper-and-ink', {theme: 'paper-and-ink', paper: {style: 'cotton'}, focusMode: false}],
  ['midnight-study', {theme: 'midnight-study', paper: {style: 'night'}, focusMode: false}],
  ['moonlit-poetry', {theme: 'moonlit-poetry', paper: {style: 'laid'}, focusMode: false}],
  ['parchment', {theme: 'paper-and-ink', paper: {style: 'parchment'}, focusMode: false}],
  ['focus-mode', {theme: 'paper-and-ink', paper: {style: 'cotton'}, focusMode: true}],
  ['focus-dark', {theme: 'paper-and-ink', paper: {style: 'cotton'}, focusMode: true, focus: {background: 'dark'}}]
];

test.serial('the typewriter stage renders every theme and paper over a live shell', async (t) => {
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(1280, 820));
  await pause(1500);
  await run(isWindows ? 'Clear-Host' : 'clear');
  await run('echo "Every line of code, a line of verse"');
  await waitForText('Every line of code, a line of verse');
  // Leave a half-typed command so the type head stands in the middle of the line.
  await page.keyboard.type('echo "Sonnet XVIII');

  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name: unknown = gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'no WebGL 2';
    const renderer = typeof name === 'string' ? name : 'unknown';
    const root = document.querySelector<HTMLElement>('.tn-root');
    const stage = document.querySelector<HTMLElement>('.tn-stage');
    return `${renderer} | class ${root?.dataset.gpu} | auto mode ${stage?.dataset.render}`;
  });
  t.log(gpu);
  await fs.mkdirp('dist/tmp');
  await fs.writeFile(`dist/tmp/${process.platform}_gpu.txt`, `${gpu}\n`);
  t.truthy(await page.$('.tn-nocturne'), 'the Nocturne stage wraps the terminal');

  // CI runners have no GPU, so `auto` draws the plain sheet there. Force the full stage for the
  // photographs; its shaders then compile on the CPU, which takes a while. Dust in the beam is an
  // animation the CPU renderer would redraw all the time, so it is left out of the pictures.
  await setNocturne({lighting: {quality: 'high', particles: 0, enabled: true}});
  t.true(await waitForMachine(120000), 'the typewriter model is drawn');
  t.true(await page.locator('.tn-quill').isVisible(), 'the quill stands at the cursor');

  for (const [name, settings] of LOOKS) {
    await setNocturne(settings);
    await pause(1500);
    await waitForMachine(60000);
    // Let the terminal redraw at its new size and the paper surface finish on the CPU.
    await pause(4000);
    await screenshot(`nocturne-${name}`);
    if (settings.focusMode) {
      t.is(await page.locator('.tn-cord').count(), 0, 'no pull cord in focus mode');
    }
  }

  await setNocturne(LOOKS[0][1]);
  await nocturneCommand('studio');
  await pause(1500);
  await waitForMachine(60000);
  await pause(4000);
  await screenshot('nocturne-studio');
  await nocturneCommand('studio');

  // The Press: a snippet printed as a folio, sealed and kept in the Archive.
  await nocturneCommand('print');
  await page.waitForSelector('.tn-press');
  await page.click('.tn-press .tn-segmented button:text-is("Snippet")');
  await page.fill('.tn-press input[aria-label="Title"]', 'On the Recursion of Leaves');
  await page.fill('.tn-press textarea', SNIPPET);
  await page.click('.tn-press .tn-button-primary');
  await page.waitForSelector('.tn-press[data-state="printed"]', {timeout: 30000});
  await pause(500);
  await screenshot('nocturne-press');
  await page.click('.tn-press .tn-segmented button:text-is("Archive")');
  await page.waitForSelector('.tn-folio', {timeout: 10000});
  t.true((await page.locator('.tn-folio').count()) >= 1, 'the folio is kept in the Archive');
  await page.click('.tn-folio-open');
  await pause(800);
  await screenshot('nocturne-archive');

  // The last command and its output, on night paper under a gold seal signed by name. Terminal
  // sources show what they will print instead of the snippet box.
  await page.click('.tn-press .tn-segmented button:text-is("Print")');
  await page.click('.tn-press .tn-segmented button:text-is("Command")');
  t.is(await page.locator('.tn-press textarea').count(), 0, 'no snippet box for terminal sources');
  t.true((await page.textContent('.tn-press-excerpt'))?.includes('Every line of code'), 'the last command');
  await page.fill('.tn-press input[aria-label="Title"]', 'Every Line of Code');
  await page.click('.tn-swatch[aria-label="Night"]');
  await page.click('.tn-swatch[aria-label="Gold"]');
  await page.click('.tn-press .tn-segmented button:text-is("Rose")');
  await page.selectOption('#tn-folio-font', 'sonnet');
  await page.fill('#tn-signature', 'Ada');
  await page.click('.tn-press .tn-button-primary');
  await page.waitForSelector('.tn-press[data-state="printed"]', {timeout: 30000});
  await pause(500);
  await screenshot('nocturne-press-night');

  // Renaming one folio, then deleting both at once.
  await page.click('.tn-press .tn-segmented button:text-is("Archive")');
  await page.waitForSelector('.tn-folio:nth-child(2)', {timeout: 10000});
  await page.click('.tn-folio-action >> nth=0');
  await page.fill('.tn-folio-rename', 'A Renamed Sonnet');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.tn-folio-title:text-is("A Renamed Sonnet")', {timeout: 10000});
  await page.click('.tn-archive-tools button:text-is("Select")');
  await page.click('.tn-archive-tools button:text-is("Select all")');
  await pause(300);
  await screenshot('nocturne-archive-select');
  await page.click('.tn-button-danger');
  await page.click('.tn-button-danger');
  await page.waitForSelector('.tn-folio', {state: 'detached', timeout: 10000});
  t.is(await page.locator('.tn-folio').count(), 0, 'the chosen folios are deleted');
  await nocturneCommand('print');
  await page.click('.term_active .xterm');

  // The half-typed command is still in the shell's line editor: effects never touched the input.
  await run('"');
  t.truthy(await waitForText(/Sonnet XVIII[\s\S]*Sonnet XVIII/));
});

test.serial('the paper clip and the bail rollers scroll the terminal', async (t) => {
  await run(isWindows ? '1..150 | ForEach-Object { "verse-$_" }' : 'seq -f "verse-%g" 1 150');
  await waitForText('verse-150');
  t.true(await waitForMachine(60000), 'the typewriter model is drawn');
  const clip = page.locator('.tn-scroll-clip');
  await clip.waitFor({timeout: 10000});
  const position = async () => Number(await clip.getAttribute('aria-valuenow'));
  const end = Number(await clip.getAttribute('aria-valuemax'));
  t.true(end > 0, 'there is scrollback');
  t.is(await position(), end);

  await page.dblclick('.tn-roller >> nth=0');
  await pause(1000);
  t.is(await position(), 0, 'the left roller rolls the paper to the top');

  // The clip glides to its place: take hold of it once it has come to rest there.
  let box = await clip.boundingBox();
  for (let i = 0; i < 40; i++) {
    await pause(250);
    const next = await clip.boundingBox();
    const settled = box && next && Math.abs(next.y - box.y) < 0.5;
    box = next;
    if (settled) {
      break;
    }
  }
  t.truthy(box, 'the clip is on screen');
  if (box) {
    const x = box.x + box.width * 0.7;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(x, y + i * 12);
    }
    await page.mouse.up();
  }
  await pause(1000);
  const dragged = await position();
  t.true(dragged > 0 && dragged < end, `dragging the clip scrolled to ${dragged} of ${end}`);
  await screenshot('nocturne-clip');

  await page.dblclick('.tn-roller >> nth=1');
  await pause(1000);
  t.is(await position(), end, 'the right roller rolls it to the bottom');
  await setNocturne({lighting: {quality: 'auto'}});
  await page.click('.term_active .xterm');
});
