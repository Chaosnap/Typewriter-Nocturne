# Changelog

Every version is built, tested and packaged by GitHub Actions; installers and SHA-256 checksums are on the
[Releases](https://github.com/Chaosnap/Typewriter-Nocturne/releases) page. All versions so far are alphas:
unsigned builds, see [docs/INSTALL.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/docs/INSTALL.md).

## 0.1.0-alpha.3

### The room

- **Pull cord**: longer and much more slender, it now comes down from the top edge with no fitting above it.
  The tassel is finer (a carved bell, rings and a skirt of loose threads), and each thread swings as its own
  pendulum, a little behind the cord. *Pull cord* in the Studio's Lamp section hides or shows it; it never
  appears in Focus Mode.
- **Paper clip scrollbar**: a wire clip hooked over the right edge of the sheet, its back loop showing beyond
  the paper. It glides to the scroll position, leans as it moves and can be dragged. Choose silver, brass,
  gold or black, a translucent white bar with adjustable opacity and width, or the system scrollbar.
  The clip also follows wheel and trackpad scrolling.
- **Bail rollers**: double-click the left roller to roll the paper to the top, the right one to roll it to
  the bottom; the platen turns as it does.
- **Ink selection**: selected text lies under a soft, feathered wash, and each character taken into the
  selection dissolves like ink in water and re-forms. *Classic* keeps xterm's selection box. Selecting and
  copying are unchanged.
- **Softer light near the bulb**: the cone opens gently near the lamp and the paper's relief flattens where
  the light is brightest, so text under the lamp is as readable as anywhere else.

### Focus Mode

- A background of its own: the chosen paper, a dark sheet, or any colour (the ink turns pale or dark to suit).
- Paper effects (texture, impressions, ink selection) and the lamp's light can each be kept or turned off.
- The pull cord is never shown.

### The Press and the Archive

- **Command**: a new source that prints the last command you ran together with its output.
- Selection, Screen and Command no longer show the snippet box; they show how many lines they will print and
  the first few, and read the terminal again when you print.
- **Paper, seal and type**: five papers (laid, cotton, vellum, parchment, night), six waxes (crimson, oxblood,
  black, gold, emerald, sapphire) each with its own silk, a one- or two-letter monogram, an emblem (moon, rose,
  quill or none), the ribbon on or off, a face for the text (Courier Prime, EB Garamond, Cormorant Garamond,
  IBM Plex Mono, the terminal's font or any installed family) and your name in
  “— set at the typewriter, by …”. A live seal preview shows what will be pressed, and every folio keeps the
  style it was printed with.
- A finer wax seal: a raised, glossy lip, spilled drops, a beaded border, embossed emblem and monogram, the
  grain and highlights of wax.
- **Archive**: rename a folio; select several (or all) and delete them at once.

## 0.1.0-alpha.2

- **Input methods**: pinyin, kana and hangul compositions strike keys while you compose, and committed text
  lands as a firm double strike; candidates, commits and what the shell receives are untouched.
- **Sounds**: richer synthesised type bars, space bar, carriage return on Enter, the platen ratchet when you
  recall history with ↑/↓, the escapement on ←/→, the tabulator, placed in stereo where the head stands.
- **Fonts**: Nerd Font presets, any installed family, and the bundled Symbols Nerd Font so icons appear with
  every face.
- **Lamp**: brightness, beam angle and aim are adjustable; a theatre-curtain pull cord at the top left
  switches it.
- **The Press and the Archive**: print a snippet, the selection or the screen as a folio set like a sonnet
  and sealed in wax; keep it locally, save it as PNG or copy it.
- Documentation site on GitHub Pages, in English and Chinese.

## 0.1.0-alpha.1

- First release. Hyper's terminal (xterm.js, node-pty) running your real shell inside a writing desk: a 3D
  typewriter whose head follows the cursor with escapement physics, paper lit by a physically based lamp,
  three themes and six papers, type impressions, synthesised typewriter sounds, Nocturne Studio, Focus Mode,
  and an Auto quality that keeps the terminal fast without a usable GPU.
- Installers for macOS (arm64, x64), Windows x64 and Linux x64 (AppImage, DEB), built in the cloud.
