# Changelog

Every version is built, tested and packaged by GitHub Actions; installers and SHA-256 checksums are on the
[Releases](https://github.com/Chaosnap/Typewriter-Nocturne/releases) page. All versions so far are alphas:
unsigned builds, see [docs/INSTALL.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/docs/INSTALL.md).

## 0.1.0-alpha.4

`0.1.0-alpha.3` was tagged but never published (one end-to-end test failed while its installers were built);
everything in it is part of this version.

### The desk

- **An ink cursor**: the block is a blot of ink with a soft edge and a darker rim, the character under it in
  the paper's colour, lying under the lamp's light like the type. While the terminal waits it sinks into the
  page and wells up again, a faint halo spreading as it fades; every keystroke inks it afresh.
- **Quill cursor**, a choice in the Studio: a quill pen the size of the block stands at the insertion point with
  its nib on the line, a raven quill on light paper, a swan quill on dark, with a gilt nib in the theme's metal.
  It breathes, a light runs up its vane, it hides when a program hides the cursor and rests, dimmed, without
  focus. Under both, xterm.js keeps its own cursor, so input methods and screen readers are unchanged. Bar and
  Line remain.
- **Papers**: Onionskin is the default sheet. Cotton is now cotton rag, felted rather than crumpled: a soft
  tooth of little rounded hills, as on cold-pressed watercolour paper, with faint threads in the pulp. Every
  paper keeps its own texture in the lamp's light and the window's.
- **Tassel**: a gilt bead, a pear-shaped mould wound in crimson silk and laced with gold cords, a twisted gold
  band at its foot, and a slightly narrower skirt of fine threads that draws in at the middle and flares at the
  ends like a hyperbola.
- **Paper clip**: a real Gem clip slid onto the sheet, with shaded wire and a soft shadow, resting at a slight
  tilt; it keeps pace with the scroll even when frames are slow.
- **Light**: the pointed beam is the default again, with Soft as a choice; on Paper & Ink it is a clean
  triangle from the type head up the page, and the *Balanced* preset brings it back. The lamp lights the sheet
  as if it were flat, so the lit page is smooth instead of glittering with dark specks. On a dark sheet the lamp
  now shows as the sheet itself lit, warm and dim, with a bloom, drawn finely enough that the beam never steps
  where it narrows to the bulb (Midnight Study's desk lamp glows amber on night paper); a desk lamp spills
  warmth into its corner.
- **Window light**: moonlight falls through an upright window of square panes with softly edged bars, in bluer
  shadow. Its panes across and down (1–6), its slant (0° upright, up to 35° either way) and where it falls on
  the page are set in the Studio, which can now also choose the light itself: the theme's, the carriage lamp, a
  desk lamp or the window.
- **New tab**: a gilt sheet icon in place of the chevron; with one profile it opens a tab at once, with more it
  lists them in a small panel.
- **Sheet width**: from the narrowest sheet to the full length of the platen; the machine keeps its size and
  the terminal gains the columns.
- **Selection** follows the mouse while you drag.

### The Press

- The folio previews live while you choose its source, text, paper, seal, ribbon and face, even before there
  is anything to print.
- **Ribbons**: the silk can be laid six ways under the seal, each shown on a little seal in the chosen wax:
  swallowtails, a loop above two tails, one band down through the seal, two bands crossed, a banner from above
  with two tails, or a pendant falling in two long tails. Its colour is the one that goes with the wax or one
  of seven silks: crimson, burgundy, navy, emerald, gold, ivory, black.
- The seal is pressed with TN until you choose your own monogram.
- A *Wax seal* switch prints with or without the seal.
- A finer seal: a bevelled, glossy pool with mottling, a twisted-cord border, softly moulded monogram and
  emblems, five-pointed stars round the moon; the ribbon is draped satin with a sheen, hems, swallowtail ends
  and a twist.
- The side panel never scrolls sideways or hides its left edge.

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
