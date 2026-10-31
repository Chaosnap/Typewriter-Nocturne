# Windows terminal mouse support

Windows sessions use node-pty 1.1.0's bundled ConPTY by default. On Windows 10
build 19045, the OS console host consumes mouse tracking sequences such as
`CSI ? 1000 h` and `CSI ? 1006 h`, preventing xterm.js from enabling mouse
reporting. This makes mouse-driven TUIs such as Herdr ignore clicks.

The bundled console host preserves these sequences. The native rebuild step
also runs node-pty's post-install script, which places `conpty.dll` and
`OpenConsole.exe` beside the addon. Both files must remain outside the ASAR.

For troubleshooting, set `config.useConptyDll` to `false` in the application's
terminal configuration to use the OS console host again. Restart the app after
changing this setting. Other platforms do not receive this Windows option.

After installing dependencies, run `pnpm run test:windows-pty` on Windows. This
uses Electron's runtime and the rebuilt addon to check that mouse tracking
modes 1000/1002/1003/1006 reach the frontend and keyboard input reaches the
child. The Windows packaging job runs this check before producing installers.

Manual acceptance: launch Herdr inside the app, click a different workspace,
then click another terminal tab. Verify that both selections change and that
the typewriter remains visible when Focus Mode is off.
