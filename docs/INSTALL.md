# Installing Typewriter Nocturne

Every installer is built on GitHub Actions. Download one from a
[release](https://github.com/Chaosnap/Typewriter-Nocturne/releases) or, for development builds, from the
**Artifacts** section of a [CI run](https://github.com/Chaosnap/Typewriter-Nocturne/actions/workflows/ci.yml)
(signed-in GitHub account required for CI artifacts).

| Platform | File |
| --- | --- |
| macOS, Apple silicon | `Typewriter-Nocturne-<version>-mac-arm64.dmg` |
| macOS, Intel | `Typewriter-Nocturne-<version>-mac-x64.dmg` |
| Windows x64 | `Typewriter-Nocturne-<version>-win-x64-setup.exe` |
| Linux x64 | `Typewriter-Nocturne-<version>-linux-x86_64.AppImage` or `…-linux-amd64.deb` |

Verify the download against `SHA256SUMS.txt` (release) or `SHA256SUMS-<platform>.txt` (CI artifact):

```bash
shasum -a 256 Typewriter-Nocturne-*.dmg
```

## Development builds are not code-signed

Signing needs paid certificates, which this project does not have yet. Unsigned builds behave differently
from signed ones, and this is expected:

**macOS.** The app is ad-hoc signed and not notarized. On first launch macOS says it cannot verify the
developer. Open *System Settings → Privacy & Security*, find the message about Typewriter Nocturne and choose
*Open Anyway*. Do not disable Gatekeeper system-wide.

**Windows.** SmartScreen shows "Windows protected your PC". Choose *More info → Run anyway* only after checking
the SHA-256 checksum. Some antivirus products are stricter with unsigned installers.

**Linux.** AppImage: `chmod +x` the file and run it. DEB: `sudo apt install ./Typewriter-Nocturne-*.deb`.

## Enabling signed builds (maintainers)

Add these repository secrets; the build picks them up automatically and otherwise stays unsigned:

| Secret | Purpose |
| --- | --- |
| `MAC_CERT_P12_BASE64`, `MAC_CERT_P12_PASSWORD` | Apple Developer ID Application certificate |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` | notarization |
| `WIN_CERT_P12_BASE64`, `WIN_CERT_P12_PASSWORD` | Windows Authenticode certificate |

## "Open TypeNoc here" in File Explorer (Windows)

The installer adds **Open TypeNoc here** to the context menu of folders, folder backgrounds and drives;
it opens a window whose shell starts in that folder. *Tools → Add/Remove “Open TypeNoc here”* does the
same later. The folder can also be given on the command line: `"Typewriter Nocturne.exe" --cwd=D:\poems`.

On Windows 11 these entries appear under *Show more options*. The top level of the new menu only shows
packaged handlers, so the app also ships one (`build/win/context-menu/`): a small `IExplorerCommand`
DLL and a sparse package that gives it the identity Windows asks for.

- When the build is signed (`WIN_CERT_P12_BASE64` and `WIN_CERT_P12_PASSWORD` above), CI signs the
  package with the same certificate and the installer registers it: the entry is at the top level for
  every user.
- Without a certificate, Windows only accepts the package in Developer Mode (*Settings → System → For
  developers*); *Tools → Add “Open TypeNoc here”* then registers it in place.

## Configuration

Settings live in `~/.config/TypewriterNocturne/` (Windows: `%APPDATA%\Typewriter Nocturne\`) and never touch
an existing Hyper installation. The `nocturne` command-line helper can be added to your PATH from
*Tools → Install `nocturne` command in PATH*.
