module.exports = {
  files: ['test/*'],
  extensions: ['ts'],
  require: ['ts-node/register/transpile-only'],
  // The last test waits for the typewriter's shaders, which CI runners compile on the CPU.
  timeout: '240s'
};
