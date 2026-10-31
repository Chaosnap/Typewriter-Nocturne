// Run with Electron's Node runtime so this exercises the rebuilt native addon.
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('../target/node_modules/node-pty');

if (process.platform !== 'win32') {
  console.log('Windows PTY regression check skipped on this platform.');
  process.exit(0);
}

const modes = [1000, 1002, 1003, 1006];
const child = `
  process.stdin.setRawMode(true);
  process.stdin.on('data', data => {
    if (data.includes(120)) {
      process.stdout.write('INPUT_OK');
      process.exit(0);
    }
  });
  process.stdout.write(${JSON.stringify(modes.map((mode) => `\x1b[?${mode}h`).join('') + 'READY')});
`;
const childPath = path.join(os.tmpdir(), `nocturne-pty-${process.pid}.js`);
fs.writeFileSync(childPath, child);
process.on('exit', () => fs.unlinkSync(childPath));
const terminal = spawn('node.exe', [childPath], {
  cols: 80,
  rows: 24,
  env: {...process.env, ELECTRON_RUN_AS_NODE: '1'},
  useConptyDll: true
});
let output = '';
let sent = false;
const timeout = setTimeout(() => {
  terminal.kill();
  console.error('Timed out waiting for PTY output and keyboard input.');
  process.exit(1);
}, 15000);
terminal.onData((data) => {
  output += data;
  if (!sent && output.includes('READY')) {
    sent = true;
    terminal.write('x');
  }
});
terminal.onExit(({exitCode}) => {
  clearTimeout(timeout);
  // The bundled console host may close its output pipe before reporting an exit code.
  if (exitCode !== undefined) {
    assert.equal(exitCode, 0);
  }
  for (const mode of modes) {
    assert.ok(
      output.includes(`\x1b[?${mode}h`),
      `Mouse mode ${mode} did not reach the terminal: ${JSON.stringify(output)}`
    );
  }
  assert.ok(output.includes('INPUT_OK'), 'Keyboard input did not reach the child');
  console.log('Windows PTY: mouse tracking sequences and keyboard input passed.');
  process.exit(0);
});
