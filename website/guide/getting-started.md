# Install

Typewriter Nocturne runs on macOS (Apple silicon and Intel), Windows x64 and Linux x64. Every installer is
built by GitHub Actions and published on the [Releases](https://github.com/Chaosnap/Typewriter-Nocturne/releases)
page together with `SHA256SUMS.txt`.

| System | File |
| --- | --- |
| macOS, Apple silicon | `Typewriter-Nocturne-<version>-mac-arm64.dmg` |
| macOS, Intel | `Typewriter-Nocturne-<version>-mac-x64.dmg` |
| Windows x64 | `Typewriter-Nocturne-<version>-win-x64-setup.exe` |
| Linux x64 | `…-linux-x86_64.AppImage` or `…-linux-amd64.deb` |

Check the download before opening it:

```bash
shasum -a 256 Typewriter-Nocturne-*.dmg
```

## The builds are not code-signed yet

Signing needs paid certificates, which the project does not have yet, so the systems ask once:

- **macOS**: after the first launch, open *System Settings → Privacy & Security* and choose *Open Anyway*.
- **Windows**: SmartScreen shows "Windows protected your PC". Choose *More info → Run anyway* once you have
  checked the checksum.
- **Linux**: make the AppImage executable with `chmod +x`, or install the DEB with
  `sudo apt install ./Typewriter-Nocturne-*.deb`.

## First steps

1. The terminal opens on a sheet of cotton paper with your usual shell. Type as you always do.
2. Pull the cord at the top left to switch the lamp off and on.
3. Open the **Nocturne Studio** with the sliders icon at the top right to choose a theme, a paper, a font,
   the light and the sounds.
4. Select some output, then open **the Press** with the quill and print it as a sealed folio.

Your settings live in their own directory and never touch an existing Hyper installation; see
[Settings files](./settings).
