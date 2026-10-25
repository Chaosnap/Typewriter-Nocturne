# Settings files

| System | Configuration directory |
| --- | --- |
| macOS, Linux | `~/.config/TypewriterNocturne/` |
| Windows | `%APPDATA%\Typewriter Nocturne\` |

It holds:

- `hyper.json`: the terminal (shell, environment, keymaps, plugins), as in Hyper,
- `nocturne.json`: everything the Studio sets,
- `archive/`: kept folios, one JSON file each.

An existing Hyper installation is never read or changed, and your shell's start-up files are never touched.

## nocturne.json

The Studio writes this file; you can also edit it by hand. Every value is checked when it is read, and
anything unknown or out of range falls back to its default.

```json
{
  "theme": "paper-and-ink",
  "focusMode": false,
  "effects": true,
  "paper": { "style": "cotton", "texture": 1, "width": 0 },
  "lighting": {
    "enabled": true,
    "preset": "balanced",
    "intensity": 1,
    "spread": 74,
    "beam": "pointed",
    "aim": 0,
    "reach": 1,
    "window": { "columns": 3, "rows": 2, "slant": 0, "x": 0.34, "y": 0.25 },
    "softness": 0.65,
    "particles": 0.45,
    "grain": 0.1,
    "quality": "auto"
  },
  "typography": {
    "font": "courier-prime",
    "customFamily": "",
    "fontSize": 15,
    "lineHeight": 1.4,
    "cursorStyle": "quill",
    "selectionStyle": "ink"
  },
  "typewriter": {
    "sound": true,
    "volume": 0.45,
    "voice": "standard",
    "marginBell": true,
    "carriage": true,
    "impression": 0.8
  },
  "print": {
    "keepInArchive": true,
    "style": {
      "paper": "laid",
      "sealColor": "crimson",
      "monogram": "N",
      "emblem": "moon",
      "seal": true,
      "ribbon": true,
      "ribbonStyle": "tails",
      "font": "typewriter",
      "customFont": "",
      "signature": ""
    }
  },
  "chrome": { "pullCord": true },
  "focus": { "background": "paper", "color": "#1c1916", "paper": true, "lighting": false },
  "scrollbar": { "style": "clip", "finish": "silver", "barOpacity": 0.45, "barWidth": 6 }
}
```

| Key | Values |
| --- | --- |
| `theme` | `paper-and-ink`, `midnight-study`, `moonlit-poetry`, or `classic` for Hyper's own look |
| `paper.style` | `cotton`, `laid`, `linen`, `onionskin`, `parchment`, `night` |
| `lighting.quality` | `auto`, `high`, `medium`, `low` |
| `lighting.spread` / `aim` | beam angle 20–160°, swivel −45° to 45° |
| `typography.font` | `courier-prime`, `ibm-plex-mono`, `jetbrains-mono-nf`, `fira-code-nf`, `hack-nf`, `meslo-nf`, `caskaydia-nf`, `custom`, … |
| `typewriter.voice` | `standard`, `portable`, `electric`, `whisper` |
| `typography.selectionStyle` | `ink` (dissolving ink), `classic` (xterm's box) |
| `print.style.paper` | `laid`, `cotton`, `vellum`, `parchment`, `night` |
| `print.style.sealColor` | `crimson`, `oxblood`, `black`, `gold`, `emerald`, `sapphire` |
| `print.style.emblem` | `moon`, `rose`, `quill`, `none` |
| `print.style.font` | `typewriter`, `sonnet`, `display`, `plex`, `terminal`, `custom` (uses `customFont`) |
| `print.style.signature` | the name after “set at the typewriter, by”, up to 40 characters |
| `focus.background` | `paper`, `dark`, `custom` (uses `focus.color`) |
| `scrollbar.style` / `finish` | `clip`, `bar`, `native` / `silver`, `brass`, `gold`, `black` |
| `scrollbar.barOpacity` / `barWidth` | 0.1–0.9 / 3–12 px |
| `typography.cursorStyle` | `quill` (default), `block`, `bar`, `underline` |
| `lighting.beam` | `pointed` (default), `soft` |
| `print.style.seal` | `true` to seal folios in wax, `false` to print without a seal |
| `print.style.ribbonStyle` | `tails` (default), `loop`, `band`, `cross`, `banner`, `pendant` |
| `paper.width` | 0 (the narrowest sheet, default) to 1 (the full length of the platen) |
| `lighting.source` | `theme` (default), `carriage`, `desk-lamp`, `moonlight` |
| `lighting.window` | moonlight's window: `columns` and `rows` 1–6, `slant` −35° to 35° (0 = upright), `x` and `y` 0–1 |
